const url = 'https://api.osemocphoto.com/frontAPI/getProjectSearch';
const params = new URLSearchParams();
params.append('ipCate', 0);
params.append('ipOrder', 'l');
params.append('ipStatus', 1);
params.append('ipOneshot', 'S');
params.append('ipKeyword', 'test');

fetch(url, {
  method: 'POST',
  body: params
})
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