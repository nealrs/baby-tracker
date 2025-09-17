const form = document.getElementById('form');
const activity = document.getElementById('activity');
//const messageDiv = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  // Prevent the default form submission (page reload)
  e.preventDefault();

  const text = activity.value.trim();
  const data = { text: text };
  const endpoint = window.location.href; // Posts to the current page's URL

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log('Server response:', responseData);
      //alert('OK, we got you fam!');
      window.location.reload();
      activity.value = ''; // Clear the textarea on success
    } else {
      console.error('Server error:', response.statusText);
      alert('Error, try again?');
    }
  } catch (error) {
    console.error('Network error??:', error);
    alert('Err, network stuff??');
  }
});
