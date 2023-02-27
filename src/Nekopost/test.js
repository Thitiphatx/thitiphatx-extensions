fetch('https://api.osemocphoto.com/frontAPI/getLatestChapter/m/0/12')
  .then(response => response.json())
  .then(data => {
    console.log(data);
    // do something with the data
  })
  .catch(error => {
    console.error(error);
  });