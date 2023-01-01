export default ()=>({
    getTime,
    getDateTime,
    getDate,
    getDay,
    request,
    getFileSize,
    displayData,
    sleep
})

const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function copy(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function displayData(data) {
  window.open('data:application/json;' + (window.btoa?'base64,'+btoa(JSON.stringify(data)):JSON.stringify(data)));
}

function getFileSize(size) {
    let i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

function getTime(time_msec) {
    let result = new Date(time_msec).toLocaleString().split(' ');
    return (result[1] + ' ' + result[2]).replace(/:.. /, ' ')
}

function getDateTime(time_msec) {
    let result = new Date(time_msec).toLocaleString().split(' ');
    return (result[0].replace(',', '') + ' ' + result[1] + ' ' + result[2]).replace(/:.. /, ' ')
}

function getDate(time_msec) {
    let result = new Date(time_msec).toLocaleString().split(' ');
    return result[0]
}

function getDay(time_msec) {
    return weekday[new Date(time_msec).getDay()];
}

function request(path, params) {
    // Change all localhost calls to port 5001, rather than the current url, to support local development
    let url = ''
    if (window.location.href.includes('http://localhost')) {
        url = "http://localhost:5001/"
    }
    return fetch(url + path + "?" + new URLSearchParams(params),
    {
        "method": "GET",
        "headers": {}
    })
    .then(response => {
        if(!response.ok){
            console.log("Server returned " + response.status + " : " + response.statusText);
        }
        return response;
    })
}
