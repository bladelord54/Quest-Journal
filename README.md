# Life Quest Journal — Android App

A gamified life-goals Android app (built with Capacitor) that turns your goals, habits, and tasks into an RPG.

## Features

✨ **Goal Hierarchy System**
- **Life Goals**: Define your long-term aspirations
- **Yearly Goals**: Break down life goals into yearly milestones
- **Monthly Goals**: Set achievable monthly targets
- **Weekly Goals**: Plan your week effectively
- **Daily Tasks**: Track day-to-day action items

🎮 **Gamification**
- Achievement sound effects when completing tasks
- Progress tracking and visualization
- Animated toast notifications for completed tasks
- Real-time progress bars

🎨 **Beautiful UI**
- Modern, clean interface with gradient designs
- Smooth animations and transitions
- Color-coded goal categories
- Responsive layout

💾 **Data Persistence**
- Automatic saving to local storage
- All your data is stored locally on your machine

## Installation

### Prerequisites
You need to have Node.js installed on your system. Download it from [nodejs.org](https://nodejs.org/)

### Steps to Run

1. **Install Dependencies**
   Open Command Prompt or PowerShell in the project folder and run:
   ```bash
   npm install
   ```

2. **Build the Android App**
   Sync the web assets into the Android project and open it in Android Studio:
   ```bash
   npm run cap:build
   ```
   From Android Studio you can run on an emulator/device or build a signed AAB
   for the Play Store. `npm run release -- x.y.z` bumps every version string and
   runs the sync in one step.

## Local Preview (development)

To iterate on the web layer before syncing to Android, compile Tailwind and
serve the project folder:

```bash
npm run build:css     # compile tailwind.css
start-server.bat      # or any static file server on the project root
```

Note: notifications, in-app updates, and other native features only run inside
the Android (Capacitor) shell, not in a plain browser preview.

## How to Use

### Setting Up Your Goals

1. **Start with Life Goals**
   - Navigate to "Life Goals" in the sidebar
   - Click "Add Life Goal" to create your big-picture objectives
   - Examples: "Achieve financial freedom", "Become fluent in Spanish", "Write a book"

2. **Break Down into Yearly Goals**
   - Go to "Yearly Goals"
   - Add specific goals for 2025 that support your life goals
   - Example: "Save $20,000" for financial freedom

3. **Create Monthly Milestones**
   - Navigate to "Monthly Goals"
   - Set what you want to achieve this month
   - Example: "Save $1,667" for November

4. **Plan Your Week**
   - Go to "Weekly Goals"
   - Add specific goals for the current week
   - Example: "Reduce spending on dining out"

5. **Add Daily Tasks**
   - Navigate to "Daily Tasks"
   - Add actionable items for today
   - Example: "Bring lunch to work"

### Completing Tasks

- Check off tasks as you complete them
- Enjoy the achievement sound and animation! 🏆
- Watch your daily progress bar fill up

### Tips

- Start broad (Life Goals) and work your way down to specific (Daily Tasks)
- Review and update your goals regularly
- Connect daily tasks to your bigger goals for motivation
- Celebrate small wins with the achievement notifications!

## Keyboard Shortcuts

- `Ctrl + N` - Add new task/goal (coming soon)
- `Ctrl + D` - Toggle dark mode (coming soon)

## Technology Stack

- **Capacitor**: Native Android app shell
- **Tailwind CSS**: Modern styling
- **Vanilla JavaScript**: Lightweight and fast
- **LocalStorage**: Data persistence
- **Web Audio API**: Achievement sound effects

## Future Enhancements

- [ ] Goal linking (connect daily tasks to life goals)
- [ ] Calendar integration
- [ ] Statistics and analytics
- [ ] Export/Import functionality
- [ ] Cloud sync
- [ ] Dark mode
- [ ] Multiple achievement sound themes
- [ ] Habit tracking streaks
- [ ] Pomodoro timer integration

## License

MIT License - Feel free to modify and use as you wish!

## Support

For issues or suggestions, please create an issue on the project repository.

---

**Start organizing your life today and achieve your goals with gamified motivation!** 🚀
