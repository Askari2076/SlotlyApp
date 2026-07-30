# Slotly — 20-Minute Time Tracker Web App

A clean, responsive, single-page web application designed for tracking daily time and effort in **20-minute blocks** (72 slots/day).

![Slotly Time Tracker](https://img.shields.io/badge/Status-Complete-emerald)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features
- **72 Slots / Day**: 12:00 AM to 11:40 PM broken into 20-minute slots with Night, Morning, Afternoon, and Evening period groupings.
- **Quick Range Fill**: Log continuous blocks of time (e.g. 2:00 PM - 4:40 PM) across multiple slots at once.
- **Customizable Categories & Goals**: 20 default categories (Work, Coding, Study, Reading, Ibadah, Quran, Family, Friends, Meals, Coffee Break, Commute, Exercise, Shower, Rest, Social Media, Errands, Chores, Planning, etc.) with custom color palettes, emojis, and daily target hours.
- **Daily Analytics**: Donut chart breakdown, top category detector, target goals achievement counter.
- **Multi-Day Trends & History**: Stacked bar charts (7/14/30 days), category line focus tracker, and detailed summary tables.
- **Data Backup & Export**: Save data to browser `localStorage`, export/import JSON backups, and export CSV logs.
- **Dark & Light Mode**: Vibrant design system with built-in theme toggle.

## Tech Stack
- HTML5 & CSS3 (Vanilla CSS variables, glassmorphism, responsive grid)
- JavaScript (ES6+, LocalStorage API)
- [Chart.js](https://www.chartjs.org/) (CDN)
- [Lucide Icons](https://lucide.dev/) (CDN)

## How to Run
Simply open `index.html` in any modern web browser or serve via any static web server:

```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.

## License
MIT License
