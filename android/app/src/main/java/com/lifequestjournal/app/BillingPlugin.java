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
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases()
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

        ensureConnected(() -> {
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

            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    rejectPurchase("Failed to query product: " + billingResult.getDebugMessage());
                    return;
                }

                if (productDetailsList == null || productDetailsList.isEmpty()) {
                    rejectPurchase("Product not found: " + productId);
                    return;
                }

                ProductDetails productDetails = productDetailsList.get(0);

                // Launch purchase flow on UI thread
                Activity activity = getActivity();
                if (activity == null) {
                    rejectPurchase("Activity not available");
                    return;
                }

                List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
                productDetailsParamsList.add(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .build()
                );

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
        ensureConnected(() -> {
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
        } else if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            rejectPurchase("Purchase canceled by user");
        } else {
            rejectPurchase("Purchase failed: " + billingResult.getDebugMessage() + " (code " + responseCode + ")");
        }
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

    private void ensureConnected(Runnable onConnected) {
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
                } else {
                    Log.e(TAG, "Billing setup failed: " + billingResult.getDebugMessage());
                    rejectPurchase("Billing setup failed: " + billingResult.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected");
            }
        });
    }
}
