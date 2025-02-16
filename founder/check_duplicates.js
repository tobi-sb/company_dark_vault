const fs = require("fs");

// Read the database file content
const fileContent = fs.readFileSync("./database.js", "utf8");

// Extract the array part and parse it
const arrayMatch = fileContent.match(/export const companies = (\[[\s\S]*\])/);
if (!arrayMatch) {
  console.error("Could not find companies array in file");
  process.exit(1);
}

// Parse the array (removing the export part)
const companies = new Map();
const duplicates = [];

// Evaluate the array content (be careful with this in production!)
const companiesArray = eval(arrayMatch[1]);

// Check for duplicates
companiesArray.forEach((company) => {
  if (companies.has(company.name)) {
    duplicates.push({
      name: company.name,
      firstId: companies.get(company.name),
      secondId: company.id,
    });
  } else {
    companies.set(company.name, company.id);
  }
});

// Print results
if (duplicates.length === 0) {
  console.log("No duplicate companies found.");
} else {
  console.log("Found duplicate companies:");
  duplicates.forEach((dup) => {
    console.log(
      `Company "${dup.name}" appears with ID ${dup.firstId} and ID ${dup.secondId}`
    );
  });
}

// Print total number of companies
console.log(`\nTotal number of companies in database: ${companies.size}`);
