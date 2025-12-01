# 📊 Attendance Analyzer

A beautiful web-based attendance analysis tool that processes CSV and Excel timesheet files to generate comprehensive attendance reports.

![Attendance Analyzer](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

## ✨ Features

- **📁 Drag & Drop Upload** - Simply drag your CSV or Excel file
- **📊 Instant Analysis** - Get attendance insights in seconds
- **⏰ Late Mark Detection** - Configurable late mark threshold
- **📅 Half Day Tracking** - Automatic half day calculation
- **🔍 Search & Sort** - Find employees quickly
- **📥 Export to CSV** - Download detailed reports
- **🎨 Beautiful Dark UI** - Modern, professional interface

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Navigate to the project folder
cd attendance-analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📤 Deploy to Vercel

### Option 1: One-Click Deploy

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Click Deploy!

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### ⚠️ Important for Vercel Deployment

**CSV Data Files**: This app includes pre-loaded company data stored in `public/data/`:
- Ambica Pharma
- Johnlee  
- Yugrow Pharmacy
- Baker & Davis Private Limited

These files are served via the API route `/api/company-data` and work seamlessly on Vercel. The dropdown selector loads these CSVs automatically when you select a company.

**No environment variables needed!** Everything is configured to work out of the box on Vercel.

## 📋 File Format Requirements

Your timesheet file should have these columns:

| Column | Description | Example |
|--------|-------------|---------|
| `Date` | Date of entry | `11/1/2025` |
| `Day` | Day of week | `Monday` |
| `Full Name` | Employee name | `John Doe` |
| `Worked Hours` | Duration worked | `8h 30m` |
| `First In` | First punch-in time | `09:30 AM` |

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Late Mark Time | 10:15 AM | Time after which check-in is considered late |
| Half Day Hours | 4.5 | Minimum hours for a full day |

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Custom CSS (Dark Theme)
- **Excel Parsing**: SheetJS (xlsx)
- **CSV Parsing**: PapaParse

## 📝 License

MIT License - Feel free to use and modify!

