package com.lifequestjournal.app;

import android.app.Activity;
import android.util.Log;

import com.android.billingclient.api.*;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String TAG = "BillingPlugin";
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        // Play Billing Library 9 migration notes (from 7.1.1):
        //  - The no-argument enablePendingPurchases() was REMOVED in PBL 8. The replacement below is
        //    functionally equivalent to the old call, per Google's migration guide.
        //  - enableAutoServiceReconnection() (added in PBL 8) makes the library re-establish a dropped
        //    service connection before an API call instead of returning SERVICE_DISCONNECTED. This plugin's
        //    onBillingServiceDisconnected() does no reconnection of its own, so without this a single
        //    disconnect left every later purchase/restore failing until the app was restarted.
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(
                        PendingPurchasesParams.newBuilder()
                                .enableOneTimeProducts()
                                .build()
                )
                .enableAutoServiceReconnection()
                .build();
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("productId is required");
            return;
        }

        pendingPurchaseCall = call;

        ensureConnected(call, () -> {
            // Query product details first
            List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
            productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            );

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build();

            // PBL 8 changed the ProductDetailsResponseListener signature: the second argument is now a
            // QueryProductDetailsResult rather than a List<ProductDetails>. The result also carries the
            // products that could NOT be fetched, each with a status code — previously an unfetchable
            // product was simply absent from the list, so "Product not found" was the only diagnosis.
            billingClient.queryProductDetailsAsync(params, (billingResult, queryProductDetailsResult) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    rejectPurchase("Failed to query product: " + billingResult.getDebugMessage());
                    return;
                }

                List<ProductDetails> productDetailsList = queryProductDetailsResult == null
                        ? null
                        : queryProductDetailsResult.getProductDetailsList();

                if (productDetailsList == null || productDetailsList.isEmpty()) {
                    rejectPurchase("Product not found: " + productId
                            + describeUnfetched(queryProductDetailsResult));
                    return;
                }

                ProductDetails productDetails = productDetailsList.get(0);

                // Launch purchase flow on UI thread
                Activity activity = getActivity();
                if (activity == null) {
                    rejectPurchase("Activity not available");
                    return;
                }

                // PBL 8 gave ONE-TIME products the multi-offer model that used to be subscription-only,
                // and the PBL 9 sample now sets an offer token for them. Omitting it still works today:
                // Play falls back to the "backward compatible" purchase option (the first buy option
                // created), which is what this single-price product has always used. Set the token when
                // Play actually returns one so a future multi-offer/rental config keeps working, but do
                // NOT invent one when the list is empty — that fallback is the legacy path.
                BillingFlowParams.ProductDetailsParams.Builder detailsParams =
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(productDetails);

                String offerToken = firstOneTimeOfferToken(productDetails);
                if (offerToken != null) {
                    detailsParams.setOfferToken(offerToken);
                }

                List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
                productDetailsParamsList.add(detailsParams.build());

                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(productDetailsParamsList)
                        .build();

                activity.runOnUiThread(() -> {
                    BillingResult result = billingClient.launchBillingFlow(activity, flowParams);
                    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        rejectPurchase("Failed to launch billing flow: " + result.getDebugMessage());
                    }
                    // If OK, wait for onPurchasesUpdated callback
                });
            });
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        ensureConnected(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build();

            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Failed to query purchases: " + billingResult.getDebugMessage());
                    return;
                }

                JSObject result = new JSObject();
                boolean found = false;

                if (purchases != null) {
                    for (Purchase purchase : purchases) {
                        if (purchase.getProducts().contains("quest_journal_premium")) {
                            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                                found = true;
                                result.put("purchaseToken", purchase.getPurchaseToken());
                                result.put("productId", "quest_journal_premium");

                                // Acknowledge if not yet acknowledged
                                if (!purchase.isAcknowledged()) {
                                    acknowledgePurchase(purchase.getPurchaseToken());
                                }
                                break;
                            }
                        }
                    }
                }

                result.put("found", found);
                call.resolve(result);
            });
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        int responseCode = billingResult.getResponseCode();

        if (responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    // Acknowledge the purchase
                    acknowledgePurchase(purchase.getPurchaseToken());

                    // Resolve the pending call
                    if (pendingPurchaseCall != null) {
                        JSObject result = new JSObject();
                        result.put("purchaseToken", purchase.getPurchaseToken());
                        result.put("productId", purchase.getProducts().get(0));
                        result.put("success", true);
                        pendingPurchaseCall.resolve(result);
                        pendingPurchaseCall = null;
                    }
                    return;
                }
            }

            // OK, but nothing is PURCHASED yet. Enabling pending one-time products (required from PBL 8)
            // makes this reachable: a cash / bank-transfer payment arrives as PENDING and is only
            // completed later. Entitlement must NOT be granted here — but the promise still has to
            // settle, otherwise `await Billing.purchase(...)` in the WebView never returns and the
            // purchase button stays dead until the app is restarted.
            boolean pending = false;
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                    pending = true;
                    break;
                }
            }
            Log.d(TAG, "onPurchasesUpdated: OK with no PURCHASED item (pending=" + pending + ")");
            if (pendingPurchaseCall != null) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("pending", pending);
                pendingPurchaseCall.resolve(result);
                pendingPurchaseCall = null;
            }
        } else if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            rejectPurchase("Purchase canceled by user");
        } else {
            rejectPurchase("Purchase failed: " + billingResult.getDebugMessage() + " (code " + responseCode + ")");
        }
    }

    /**
     * Returns the offer token of the first eligible one-time purchase offer, or null when Play does
     * not expose an offer list for this product (the legacy single-price shape). Returning null is a
     * meaningful answer, not a failure: the caller then omits setOfferToken() and Play uses the
     * backward-compatible purchase option.
     */
    private String firstOneTimeOfferToken(ProductDetails productDetails) {
        List<ProductDetails.OneTimePurchaseOfferDetails> offers =
                productDetails.getOneTimePurchaseOfferDetailsList();
        if (offers == null || offers.isEmpty()) return null;

        String token = offers.get(0).getOfferToken();
        return (token == null || token.isEmpty()) ? null : token;
    }

    /**
     * PBL 8+ reports the products it could NOT fetch, each with a status code. Before that an
     * unfetchable product was simply missing from the list, so every failure looked identical.
     * Used only to enrich the rejection message.
     */
    private String describeUnfetched(QueryProductDetailsResult result) {
        if (result == null) return "";
        List<UnfetchedProduct> unfetched = result.getUnfetchedProductList();
        if (unfetched == null || unfetched.isEmpty()) return "";

        StringBuilder sb = new StringBuilder(" (unfetched:");
        for (UnfetchedProduct product : unfetched) {
            sb.append(' ').append(product.getProductId())
              .append(" status=").append(product.getStatusCode());
        }
        return sb.append(')').toString();
    }

    private void acknowledgePurchase(String purchaseToken) {
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();

        billingClient.acknowledgePurchase(params, billingResult -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchase acknowledged successfully");
            } else {
                Log.w(TAG, "Failed to acknowledge purchase: " + billingResult.getDebugMessage());
            }
        });
    }

    private void rejectPurchase(String message) {
        Log.e(TAG, message);
        if (pendingPurchaseCall != null) {
            pendingPurchaseCall.reject(message);
            pendingPurchaseCall = null;
        }
    }

    private void ensureConnected(PluginCall call, Runnable onConnected) {
        if (billingClient.isReady()) {
            onConnected.run();
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing client connected");
                    onConnected.run();
                    return;
                }

                String message = "Billing setup failed: " + billingResult.getDebugMessage();
                Log.e(TAG, message);
                // Reject the call that actually triggered this connection. This used to call
                // rejectPurchase() unconditionally, which only settles pendingPurchaseCall — so a setup
                // failure during restorePurchases() (which never sets that field) left the JS promise
                // hanging forever, and could even reject an unrelated in-flight purchase instead.
                if (call == null) return;
                if (call == pendingPurchaseCall) {
                    pendingPurchaseCall = null;
                }
                call.reject(message);
            }

            @Override
            public void onBillingServiceDisconnected() {
                // No manual reconnect needed: enableAutoServiceReconnection() (set in load()) makes the
                // library re-establish the connection before the next API call.
                Log.w(TAG, "Billing service disconnected");
            }
        });
    }
}
