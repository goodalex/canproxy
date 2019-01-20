function getUri(path) {
    return "api/v1/runs"+path;
}

function post(runid, actionpath) {
    return $.post( getUri("/"+runid+actionpath) );
}

function create(input) {
    //return $.post( getUri(""), input);

    return jQuery.ajax ({
        url: getUri(""),
        type: "POST",
        data: input,
        dataType: "json",
        contentType: "application/json; charset=utf-8"
    });
}


function deleteAll() {

    return jQuery.ajax ({
        url: getUri(""),
        type: "DELETE"
    });
}


var runsApi = {
    post: post,
    create: create,
    deleteAll: deleteAll
};