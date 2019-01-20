rps=100 && runtime=600 \
&& if [ -f /targets.txt ]; then rm /targets.txt; fi \
&& for i in `seq 1 10`; do \
printf "GET http://webservice.ywc.svc.cluster.local/products/$i\n" >> /targets.txt; \
done \
&& if [ ! -d /results ]; then mkdir /results; fi \
&& ./vegeta -cpus 2 attack -targets "/targets.txt" -duration ${runtime}s -rate ${rps} -keepalive false -workers 8 > /results/result-$(date '+%Y-%m-%d_%H-%M').gob