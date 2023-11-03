sudo docker stop flp
sudo docker rm flp
sudo docker build -t glowman554/flp-backend .
sudo docker run -d --name flp --restart always -v ./config:/config -v /etc/letsencrypt:/etc/letsencrypt -p 3877:3877 --network production_db_default glowman554/flp-backend
sudo docker logs flp -f