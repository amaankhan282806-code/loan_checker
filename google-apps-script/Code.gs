/**
 * Optional Google Sheets sink. Set SHEET_ID and FINWISE_TOKEN in Script
 * Properties, then deploy as a web app that executes as the owner.
 */
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('FINWISE_TOKEN');
  var row = JSON.parse(e.postData.contents || '{}');
  if (!expected || row.token !== expected) {
    return ContentService.createTextOutput('Unauthorized');
  }
  var allowed = ['type', 'title', 'detail', 'value', 'at'];
  var values = allowed.map(function (key) {
    return String(row[key] || '').slice(0, 120);
  });
  var sheet = SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['type', 'title', 'detail', 'value', 'at']);
  }
  sheet.appendRow(values);
  return ContentService.createTextOutput('OK');
}
