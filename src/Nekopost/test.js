fetch("https://api.osemocphoto.com/frontAPI/getProjectInfo/12377")
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log('Response data:', data);
  })
  .catch(error => {
    console.error('There was a problem with the fetch operation:', error);
  });