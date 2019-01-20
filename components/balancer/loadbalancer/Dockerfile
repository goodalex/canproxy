FROM openresty/openresty:1.13.6.1-2-alpine-fat

# ywc nginx setup
ENV YWC_HOME=/ywc
ENV YWC_RUNTIME=/ywc/runtime
ENV YWC_PROV_DIR $YWC_RUNTIME/provisioning

RUN mkdir -p $YWC_HOME \
 && mkdir -p $YWC_RUNTIME \
 && mkdir -p $YWC_RUNTIME/logs \
 && mkdir -p $YWC_PROV_DIR

COPY resources/ $YWC_HOME/

RUN mkdir -p $YWC_HOME/lbmodules
COPY modules/ $YWC_HOME/lbmodules

ENV START_CMD="nginx -p $YWC_RUNTIME -c $YWC_RUNTIME/nginx.conf -g 'daemon off;'"

RUN chmod +x $YWC_HOME/*.sh \
 && $YWC_HOME/./config_create.sh \
 && ln -sf /dev/stderr $YWC_RUNTIME/logs/error.log

#  && ln -sf /dev/stdout $YWC_RUNTIME/logs/access.log \ - keep logs but dont redirect

# start
CMD cat /ywc/runtime/loadbalancer.conf >> $YWC_RUNTIME/logs/access.log && eval $START_CMD
