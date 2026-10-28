function exportSheetToJsonAndPushToGithub() {
  // 1. Fetch data from the active Google Sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();

  if (rows.length < 2) return; // Empty sheet check

  // Convert spreadsheet rows into a JSON array of objects
  var headers = rows[0];
  var jsonData = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    jsonData.push(obj);
  }

  var jsonString = JSON.stringify(jsonData, null, 2);

  // 2. GitHub Configuration
  var pat = PropertiesService.getScriptProperties().getProperty("GH_PAT");
  // var owner = 'YOUR_GITHUB_USERNAME';
  var owner = "tnn4";
  // var repo = 'YOUR_REPO_NAME';
  var repo = "cbggc-frontend";
  var branch = "main"; // change to 'gh-pages' if your data lives on a separate branch
  // var filePath = 'sheet-data.json'; // The relative path in your repo
  var filePath = "bg-list.json";

  var baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  var headersOption = {
    Authorization: `Bearer ${pat}`,
    Accept: "vnd.github+json",
    "User-Agent": "Google-Apps-Script",
  };

  // 3. Check if the file already exists to get its 'sha' hash (required for updates)
  var sha = null;
  try {
    var response = UrlFetchApp.fetch(baseUrl, {
      method: "get",
      headers: headersOption,
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 200) {
      var fileInfo = JSON.parse(response.getContentText());
      sha = fileInfo.sha;
    }
  } catch (e) {
    Logger.log("File doesn't exist yet or error checking: " + e.toString());
  }

  // 4. Build payload and commit the file
  var payload = {
    message: "Update data from Google Sheets", // 'Update data from Google Sheets [skip ci]', // [skip ci] prevents infinite action loops
    content: Utilities.base64Encode(jsonString, Utilities.Charset.UTF_8),
    branch: branch,
  };

  if (sha) {
    payload.sha = sha; // Include SHA if we are modifying an existing file
  }

  var putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  var commitResponse = UrlFetchApp.fetch(putUrl, {
    method: "put",
    contentType: "application/json",
    headers: headersOption,
    payload: JSON.stringify(payload),
  });

  Logger.log(commitResponse.getContentText());
}
