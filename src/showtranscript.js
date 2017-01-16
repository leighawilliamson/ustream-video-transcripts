/**
 * Showtranscript
 */

function createTableRow(sentence) {
  //var dateObj = new Date(date);
  //var formattedDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString();
  return '<tr> <td>' + sentence + '</td></tr>';
}

/**
 * Populate the hiscore table by retrieving top 10 scores from the DB. 
 * Called when the DOM is fully loaded.
 */
var sentences = [];
function populateTable() {	
  var table = $("#transcript_table tr");
  $.get("/view_transcript", function (data) {
     // console.log('data: ', data);
    sentences = JSON.parse(data);
     // console.log('sentences: ', sentences);
    sentences.forEach(function (sentence) {
    //    console.log('sentence: ', sentence);
        var html = createTableRow(sentence);
        table.last().before(html);		
     });
  });	
}

$(populateTable);