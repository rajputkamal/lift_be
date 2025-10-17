export const calculatePrice = (originCoords, destinationCoords) => {
  const { latitude: lat1, longitude: lon1 } = originCoords;
  const { latitude: lat2, longitude: lon2 } = destinationCoords;

  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius (km)

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  let price = Math.round(distance * 10);
  if (distance < 5) price += 10;

  return { distance: Number(distance.toFixed(2)), price };
};
