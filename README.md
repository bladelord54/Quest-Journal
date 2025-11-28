# Life Organize - Windows Desktop Application

A beautiful Windows desktop application for managing your life goals with gamification features!

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

2. **Start the Application**
   ```bash
   npm start
   ```

### Building for Windows

To create a standalone Windows executable:

```bash
npm run build
```

The installer will be created in the `dist` folder.

## Alternative: Run in Browser

If you don't want to install Node.js, you can run the app directly in a web browser:

1. Simply open `index.html` in any modern web browser (Chrome, Edge, Firefox)
2. All features will work except the native window controls

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

- **Electron**: Desktop application framework
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
