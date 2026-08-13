fetch('http://localhost:5000/api/exercises')
  .then(res => res.json())
  .then(data => console.log('Exercises count:', data.length, data.slice(0, 2)))
  .catch(err => console.error(err));
