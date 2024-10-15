// Hàm xử lý ngày tháng
export const getTime = (time) => {
  const date = new Date(time);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  return formattedDate;
};

// Hàm lấy id của video Youtube
export const getYoutubeVideoId = (url) => {
  const regex = /(?:\/|%3D|v=)([0-9A-Za-z_-]{11})(?:\S+)?/;
  const match = url.match(regex);
  return match ? match[1] : null;
};
