export const environment = {
  production: true,
  base_url:
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/?$/, "/") || "/api/",
  client_id: "0hARoTOcX7F8dAzxrrgMXeFjPz2_tK_wP_XiixBRLpc",
  client_secret:
    "fzSZeQ9YACxxFGthUjbuHDxQ2V6ElrzmvnEVMK9xMC43tiH0BNuE_vAd4C7g3XOz4yt1URSYfOkTnadsRAYJhw",
};
