/* Copyright (C) 2016 NooBaa */
'use strict';

const _ = require('lodash');

const BlobError = require('../blob_errors').BlobError;

function list_blobs(req, res) {
    let params = {
        bucket: req.params.bucket,
        upload_mode: false,
    };
    if ('prefix' in req.query) {
        params.prefix = req.query.prefix;
    }
    if ('delimiter' in req.query) {
        params.delimiter = req.query.delimiter;
    }
    if ('marker' in req.query) {
        params.key_marker = req.query.marker;
    }

    let max_keys_received = Number(req.query.maxresults || 1000);
    if (!_.isInteger(max_keys_received) || max_keys_received < 0) {
        throw new BlobError(BlobError.InvalidArgument);
    }
    params.limit = Math.min(max_keys_received, 1000);

    return req.rpc_client.object.list_objects_s3(params)
        .then(reply => ({
            EnumerationResults: {
                _attr: {
                    ContainerName: req.params.bucket,
                },
                _content: {
                    Prefix: req.query.prefix,
                    Marker: req.query.marker,
                    MaxResults: req.query.maxresults,
                    Delimiter: req.query.delimiter,
                    NextMarker: reply.next_marker,
                    Blobs: [
                        reply.objects.map(obj => ({
                            Blob: {
                                Name: obj.key,
                                Properties: {
                                    // ETag: `"${obj.info.etag}"`,
                                    ETag: obj.info.etag,
                                    BlobType: 'BlockBlob',
                                    LeaseStatus: 'unlocked',
                                    LeaseState: 'available',
                                    ServerEncrypted: false,
                                    'Last-Modified': (new Date(obj.info.create_time)).toUTCString(),
                                    'Content-Length': obj.info.size,
                                    'Content-Type': obj.info.content_type,
                                    // 'Content-Encoding': {},
                                    // 'Content-Language': {},
                                    // 'Content-MD5': {},
                                    // 'Cache-Control': {},
                                    // 'Content-Disposition': {},
                                }
                            }
                        })),
                        reply.common_prefixes.map(prefix => ({
                            BlobPrefix: {
                                Name: prefix
                            }
                        }))
                    ],
                },
            }
        }));
}

module.exports = {
    handler: list_blobs,
    body: {
        type: 'empty',
    },
    reply: {
        type: 'xml',
    },
};
