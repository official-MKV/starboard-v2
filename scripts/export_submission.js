const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Initialize Supabase client
const supabaseUrl = 'https://oldgkmekeakunfeknwdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZGdrbWVrZWFrdW5mZWtud2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTQ1NjEsImV4cCI6MjA2NDYzMDU2MX0.8FF14PAA7c-2zTPamzujSvbSX7hGEXeMXK_H1MXmfqk'

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

class SubmissionExtractor {
  constructor() {
    this.application = null;
    this.fields = [];
    this.submissions = [];
  }

  async fetchSubmissions(applicationId) {
    try {
      console.log(`🔍 Fetching data for application: ${applicationId}...`);
      
      // Fetch application details
      console.log('📋 Fetching application details...');
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (appError) {
        if (appError.code === 'PGRST116') {
          console.error(`❌ Application not found: ${applicationId}`);
          console.error('Please check the application ID is correct');
        }
        throw appError;
      }
      this.application = application;
      console.log(`✅ Found application: "${application.title}"`);

      // Fetch form fields
      console.log('📝 Fetching form fields...');
      const { data: fields, error: fieldsError } = await supabase
        .from('application_fields')
        .select('*')
        .eq('applicationId', applicationId)
        .order('order', { ascending: true });

      if (fieldsError) throw fieldsError;
      this.fields = fields;
      console.log(`✅ Found ${fields.length} form fields`);
      
      // Log choice fields with their options for debugging
      const choiceFields = fields.filter(f => ['SELECT', 'RADIO', 'CHECKBOX'].includes(f.type));
      if (choiceFields.length > 0) {
        console.log(`📋 Found ${choiceFields.length} choice field(s) with options:`);
        choiceFields.forEach(field => {
          const optionCount = field.options ? field.options.length : 0;
          console.log(`   • ${field.label} (${field.type}): ${optionCount} option(s)`);
        });
      }

      // Fetch submissions (without joins first)
      console.log('👥 Fetching submissions...');
      const { data: submissions, error: submissionsError } = await supabase
        .from('application_submissions')
        .select('*')
        .eq('applicationId', applicationId)
        .order('createdAt', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Now fetch user details separately to avoid the relationship conflict
      console.log('👤 Fetching user details...');
      const userIds = [...new Set(submissions.filter(s => s.userId).map(s => s.userId))];

      let usersMap = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, firstName, lastName')
          .in('id', userIds);

        if (!usersError && users) {
          usersMap = users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }

      // Merge user data with submissions
      this.submissions = submissions.map(submission => ({
        ...submission,
        user: submission.userId ? usersMap[submission.userId] : null
      }));

      console.log(`✅ Found ${this.submissions.length} submissions`);
      return this.submissions;

    } catch (error) {
      console.error('❌ Error fetching submissions:', error.message);
      if (error.code) console.error('Error code:', error.code);
      if (error.details) console.error('Error details:', error.details);
      throw error;
    }
  }

  // Convert complex field values to CSV-friendly strings
  formatFieldValue(field, value) {
    if (!value && value !== 0 && value !== false) {
      return '';
    }

    // Helper function to get option label by value
    const getOptionLabel = (optionValue) => {
      if (!field.options || !Array.isArray(field.options)) return optionValue;
      const option = field.options.find(opt => opt.value === optionValue);
      return option ? option.label : optionValue;
    };

    switch (field.type) {
      case 'BOOLEAN':
        return value ? 'Yes' : 'No';
      
      case 'SELECT':
      case 'RADIO':
        // Single selection - look up the label for the selected value
        return getOptionLabel(value);
      
      case 'CHECKBOX':
        // Multiple selections - look up labels for all selected values
        if (Array.isArray(value)) {
          return value.map(val => getOptionLabel(val)).join('; ');
        } else {
          // If it's a single value (shouldn't happen for checkbox but just in case)
          return value ? getOptionLabel(value) : 'Unchecked';
        }
      
      case 'FILE_UPLOAD':
      case 'MULTI_FILE':
        if (Array.isArray(value)) {
          return value.map(file => file.name || file.url || file).join('; ');
        }
        return typeof value === 'object' ? (value.name || value.url || JSON.stringify(value)) : value;
      
      case 'DATE':
        return new Date(value).toLocaleDateString();
      
      case 'DATETIME':
        return new Date(value).toLocaleString();
      
      case 'TEXTAREA':
      case 'RICH_TEXT':
        // Clean up text for CSV - remove line breaks and extra spaces
        return String(value).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      
      default:
        // For arrays or objects, stringify them
        if (Array.isArray(value)) {
          return value.join('; ');
        } else if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return String(value);
    }
  }

  // Generate simplified CSV content - only first name, last name, and form fields
  generateCSV() {
    if (!this.submissions.length) {
      console.log('⚠️ No submissions found to export');
      return '';
    }

    // Build headers - only First Name, Last Name, and form field labels
    const headers = [
      'First Name',
      'Last Name',
      ...this.fields.map(field => field.label)
    ];

    // Build rows
    const rows = [headers];

    this.submissions.forEach(submission => {
      // Get first name and last name from user or applicant fields
      const firstName = submission.user?.firstName || 
                       submission.applicantFirstName || 
                       '';
      const lastName = submission.user?.lastName || 
                      submission.applicantLastName || 
                      '';

      // Start row with first name and last name
      const row = [firstName, lastName];

      // Add form field responses in the order of fields
      this.fields.forEach(field => {
        const value = submission.responses?.[field.id];
        row.push(this.formatFieldValue(field, value));
      });

      rows.push(row);
    });

    // Convert to CSV format
    return rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  }

  // Save CSV to file
  async saveCSV(filename = null) {
    const csv = this.generateCSV();
    if (!csv) return null;

    const fileName = filename || `submissions_${this.application.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
    
    try {
      fs.writeFileSync(fileName, csv);
      console.log(`📄 CSV exported to: ${fileName}`);
      console.log(`📊 Exported ${this.submissions.length} submissions with First Name, Last Name, and ${this.fields.length} form fields`);
      
      // Show choice field processing info
      const choiceFields = this.fields.filter(f => ['SELECT', 'RADIO', 'CHECKBOX'].includes(f.type) && f.options);
      if (choiceFields.length > 0) {
        console.log(`✨ Processed ${choiceFields.length} choice field(s) with option lookups`);
      }
      
      return fileName;
    } catch (error) {
      console.error('❌ Error saving CSV:', error.message);
      throw error;
    }
  }

  // Print summary
  printSummary() {
    if (!this.application) return;

    console.log(`\n📊 Application: ${this.application.title}`);
    console.log('='.repeat(60));
    console.log(`Total Submissions: ${this.submissions.length}`);
    console.log(`Form Fields: ${this.fields.length}`);
    console.log(`Export Format: First Name, Last Name + ${this.fields.length} form fields`);
    
    if (this.submissions.length > 0) {
      console.log(`\nForm Fields to Export:`);
      this.fields.forEach((field, index) => {
        let fieldInfo = `  ${index + 1}. ${field.label} (${field.type})`;
        
        // Show options for choice fields
        if ((field.type === 'SELECT' || field.type === 'RADIO' || field.type === 'CHECKBOX') && field.options) {
          const optionLabels = field.options.map(opt => opt.label).join(', ');
          fieldInfo += ` - Options: ${optionLabels}`;
        }
        
        console.log(fieldInfo);
      });
      
      console.log(`\nLatest Submission: ${new Date(this.submissions[0].createdAt).toLocaleString()}`);
      
      // Show sample of first few submissions with better formatting
      const sampleSize = Math.min(3, this.submissions.length);
      console.log(`\nSample Submissions (${sampleSize} of ${this.submissions.length}):`);
      this.submissions.slice(0, sampleSize).forEach((submission, index) => {
        const firstName = submission.user?.firstName || submission.applicantFirstName || 'N/A';
        const lastName = submission.user?.lastName || submission.applicantLastName || 'N/A';
        console.log(`  ${index + 1}. ${firstName} ${lastName} (${submission.status})`);
        
        // Show a few sample field responses
        const sampleFields = this.fields.slice(0, 2);
        sampleFields.forEach(field => {
          const value = submission.responses?.[field.id];
          const formattedValue = this.formatFieldValue(field, value);
          if (formattedValue) {
            console.log(`     ${field.label}: ${formattedValue.length > 50 ? formattedValue.substring(0, 47) + '...' : formattedValue}`);
          }
        });
      });
    }
  }
}

// Main function to extract and export
async function extractSubmissions(applicationId, filename = null) {
  const extractor = new SubmissionExtractor();
  
  try {
    // Fetch submissions
    await extractor.fetchSubmissions(applicationId);
    
    // Print summary
    extractor.printSummary();
    
    // Export to CSV
    const csvFile = await extractor.saveCSV(filename);
    
    return {
      submissions: extractor.submissions,
      csvFile,
      summary: {
        total: extractor.submissions.length,
        fields: extractor.fields.length,
        application: extractor.application.title
      }
    };
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  }
}

// Quick extraction function for single use
async function quickExtract(applicationId) {
  console.log('🚀 Starting submission extraction...');
  return await extractSubmissions(applicationId);
}

// Export functions
module.exports = { SubmissionExtractor, extractSubmissions, quickExtract };

// If running directly
if (require.main === module) {
  console.log('🚀 Starting simplified submission extractor...');
  
  const applicationId = process.argv[2];
  if (!applicationId) {
    console.error('❌ ERROR: Application ID is required');
    console.error('Usage: node export_submission.js <application-id>');
    console.error('Example: node export_submission.js cmcjc7h4q0001ib048khhegro');
    process.exit(1);
  }
  
  console.log(`📋 Application ID: ${applicationId}`);
  
  quickExtract(applicationId)
    .then(result => {
      console.log('\n🎉 SUCCESS! Simplified export completed');
      console.log(`📁 CSV File: ${result.csvFile}`);
      console.log(`📊 Total submissions: ${result.summary.total}`);
      console.log(`📋 Format: First Name, Last Name + ${result.summary.fields} form fields`);
    })
    .catch(error => {
      console.error('\n💥 EXPORT FAILED!');
      console.error('Error details:', error.message);
      if (error.code) console.error('Error code:', error.code);
      if (error.details) console.error('Error details:', error.details);
      process.exit(1);
    });
}