HOST=https://tevz2ufrel.execute-api.us-east-1.amazonaws.com
APIKEY="wqDMwJeh7c5V1uNLsXExT3fE5qRIMYyk58taNT62"

while :
do
curl --silent \
    -H "x-api-key: $APIKEY" \
    $HOST/dev/hello
done