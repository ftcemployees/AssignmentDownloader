/**
 * This function will download all user submissions from
 * a course. It browsers all of the submissions folders, and
 * extracts and downloads the student submitted files.
 */
function downloadSubmissions() {
  // Get the OrgUnitId
  var url = window.location.href;
  var split = url.split('?ou=');
  var courseId = split[1];

  // get the initial list of submission folders
  $.ajax({
    method: 'GET',
    url: `/d2l/api/le/1.19/${courseId}/dropbox/folders/`,
    headers: {
      'X-Csrf-Token': localStorage['XSRF.Token']
    },
    success: function(data) {
      // when completed, call the the handleFolders callback
      // to process the array of folders.
      handleFolders(data);
    }
  });


  /**
   * Passes each folder Id to the getSubmission function for folder processing.
   *
   * @param data - an array of Folder objects.
   */
  function handleFolders(data) {
    // Loop through each folder, and extract Id from each.
    // Pass it to getSubmission to extract all submission data
    // from each folder.
    for (var i = 0; i < data.length; i++) {
      getSubmission(data[i].Id);
    }
  }

  /**
   *  Uses an AJAX call to get all the submissions to the provided folderId
   *
   *  @param folderId - the Id of the folder to be processed.
   */
  function getSubmission(folderId) {
    $.ajax({
      method: 'GET',
      url: `/d2l/api/le/1.19/${courseId}/dropbox/folders/${folderId}/submissions/`,
      headers: {
        'X-Csrf-Token': localStorage['XSRF.Token']
      },
      success: function(data) {
        // data returns an array of objects which in turn contain an array
        // of Submission objects
        for (var j = 0; j < data.length; j++) {
          // Use processSubs to loop through the returned submission objects
          processSubs(folderId, data[j].Submissions);
        }
      }
    });
  }


  /**
   * Loops through the provided submissions, and proccess the files for each.
   * @param folderId - The Id of the submission folder
   * @param subs - an array of submissions for a particular folder.
   */
  function processSubs(folderId, subs) {
    for (var i = 0; i < subs.length; i++) {
      processFiles(folderId, subs[i].Id, subs[i].Files);
    }
  }

  // A variable to store the ids of downloaded files in
  var downloadedFiles = []

  /**
   * Checks to ensure the file is not previously downloaded, and
   * downloads the unique files.
   */
  function processFiles(folderId, subId, files) {
    for (var i = 0; i < files.length; i++) {
      if (downloadedFiles.indexOf(files[i].fileId) === -1) {
        downloadFile(folderId, subId, files[i].FileId);
        downloadedFiles.push(files[i].FileId);
      } else {

      }
    }
  }


  /**
   * Because JQuery cannot handle binary file stream responses, we must use the XMLHttpRequest method
   *
   * @param folderId - id of the submission folder
   * @param subId - the submission id
   * @param fileId - the file to be downloaded.
   */
  function downloadFile(folderId, subId, fileId) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', `/d2l/api/le/1.19/${courseId}/dropbox/folders/${folderId}/submissions/${subId}/files/${fileId}`, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
      if (this.status === 200) {
        var filename = "";
        var disposition = xhr.getResponseHeader('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          var matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
        }
        var type = xhr.getResponseHeader('Content-Type');

        var blob = new Blob([this.response], {
          type: type
        });
        if (typeof window.navigator.msSaveBlob !== 'undefined') {
          // IE workaround for "HTML7007: One or more blob URLs were revoked by closing the blob for which they were created. These URLs will no longer resolve as the data backing the URL has been freed."
          window.navigator.msSaveBlob(blob, filename.replace('UTF-8', ''));
        } else {
          var URL = window.URL || window.webkitURL;
          var downloadUrl = URL.createObjectURL(blob);

          if (filename) {
            // use HTML5 a[download] attribute to specify filename
            var a = document.createElement("a");
            // safari doesn't support this yet
            if (typeof a.download === 'undefined') {
              window.location = downloadUrl;
            } else {
              a.href = downloadUrl;
              a.download = filename.replace('UTF-8', '');
              document.body.appendChild(a);
              a.click();
            }
          } else {
            window.location = downloadUrl;
          }

          setTimeout(function() {
            URL.revokeObjectURL(downloadUrl);
          }, 100); // cleanup
        }
      }
    };
    xhr.setRequestHeader('X-Csrf-Token', localStorage['XSRF.Token']);
    xhr.send();
  }

}

// downloadSubmissions();
