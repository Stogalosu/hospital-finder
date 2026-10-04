const hospitals = require('./hospital_list.json'); //vector de spitale
const GOOGLE_MAPS_API_KEY= "AIzaSyCupLTxVqyBrhxq3BJePUQMTRWoiaGX_nw";

// click simulat
const mouseClick={
    latitude: 44.427489,
    longitude: 26.104000
};
 const targetHospital = hospitals[0];
 
 async function doRoute(origin, destination){
    //google directions api url
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.coordinates.latitude},${destination.coordinates.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
    try{
        const response = await fetch(url);
        const data = await response.json();
        if(data.status === "OK"){
            const route=data.routes[0].legs[0];
            const polyline = data.routes[0].overview_polyline.points;

            console.log(`Route to ${destination.name}:`);
            console.log(`Distance: ${route.distance.text}`);
            console.log(`Estimated Time: ${route.duration.text}`);
            console.log(`Polyline String: ${polyline}`);
        } else {
            //console.error("Google Maps API Error:", data.status, data.error_message);
            console.log("Full Google Response:", data);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    } 
 }

 doRoute(mouseClick, targetHospital);
