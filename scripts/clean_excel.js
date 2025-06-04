const XLSX = require('xlsx')
const fs = require('fs')

// Configuration
const INPUT_FILE = 'resources/data.xlsx'
const YES_OUTPUT = 'resources/final_decision_yes.xlsx'
const NO_OUTPUT = 'resources/final_decision_no.xlsx'

// Define the columns you want to keep
const COLUMNS_TO_KEEP = [
  'Startup Name',
  'Total Responses',
  'Maybe',
  'No',
  'Yes',
  'Maureen',
  'Nath',
  'FINAL DECISION',
  'NAME',
  'GENDER',
  'EMAIL',
  'PHONE NUMBER',
  'STARTUP DESCRIPTION',
  'SECTOR',
  'WEBSITE',
  'INITIAL EVALUATION SCORE',
  'Column 11',
]

try {
  // Read input file
  const workbook = XLSX.readFile(INPUT_FILE)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet)

  // Filter and process data
  const yesData = []
  const noData = []

  data.forEach(row => {
    // Create a new object with only the columns we want
    const filteredRow = {}
    COLUMNS_TO_KEEP.forEach(col => {
      if (row[col] !== undefined) {
        filteredRow[col] = row[col]
      }
    })

    // Categorize based on FINAL DECISION
    if (row['FINAL DECISION']?.toString().toLowerCase() === 'yes') {
      yesData.push(filteredRow)
    } else if (row['FINAL DECISION']?.toString().toLowerCase() === 'no') {
      noData.push(filteredRow)
    }
  })

  // Create new workbooks
  const yesWorkbook = XLSX.utils.book_new()
  const noWorkbook = XLSX.utils.book_new()

  const yesWorksheet = XLSX.utils.json_to_sheet(yesData)
  const noWorksheet = XLSX.utils.json_to_sheet(noData)

  // Add worksheets to workbooks
  XLSX.utils.book_append_sheet(yesWorkbook, yesWorksheet, 'Yes Decisions')
  XLSX.utils.book_append_sheet(noWorkbook, noWorksheet, 'No Decisions')

  // Write files
  XLSX.writeFile(yesWorkbook, YES_OUTPUT)
  XLSX.writeFile(noWorkbook, NO_OUTPUT)

  console.log(`Processing complete:
    - ${yesData.length} "Yes" records saved to ${YES_OUTPUT}
    - ${noData.length} "No" records saved to ${NO_OUTPUT}`)
} catch (error) {
  console.error('Error processing file:', error.message)
  process.exit(1)
}
