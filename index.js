/*
 * ATLauncher API - NodeJS - https://github.com/ATLauncher/ATLauncher-API---NodeJS
 * Copyright (C) 2015 ATLauncher
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

module.exports = function (apiKey, forceRun) {
    var request = require('request'),
        fs = require('fs'),
        baseUrl = 'https://api.atlauncher.com/',
        version = 'v1',
        forceRun = forceRun || false;

    var makeUrl = function (path) {
        return baseUrl + version + '/' + (path ? path : '');
    };

    var saveToFile = function (err, res, saveTo, base64, callback) {
        if (base64 && !callback) {
            callback = base64;
            base64 = false;
        }

        if (err || res.error) {
            return callback(err, res);
        }

        var data = res.data;

        if (base64) {
            data = new Buffer(res.data, 'base64');
        }

        fs.writeFile(saveTo, data, function (e) {
            if (e) {
                return callback(e, res);
            } else {
                res = 'Saved to ' + saveTo + '!';
            }

            return callback(err, res);
        });
    };

    var makeRequest = function (needsApiKey, path, method, data, callback) {
        if (needsApiKey && !apiKey) {
            return console.error('An API Key must be set in order to make this request!');
        }

        if (data && !callback) {
            callback = data;
            data = false;
        }

        var options = {
            url: path,
            json: true,
            method: method,
            headers: {
                'User-Agent': 'node/atlauncher-api'
            }
        };

        if ((method == 'POST' || method == 'PUT' || method == 'DELETE') && data) {
            options.body = data;
        }

        if (apiKey) {
            options.headers['API-KEY'] = apiKey;
        }

        request(options, function (err, req, body) {
            if (!err && body.error && body.code == 401 && body.message == 'API key missing or invalid!') {
                console.error('The API key provided was not valid!');
            }

            if (!err && body && body.code == 429 && !forceRun) {
                // Exceeded API request limit, we must stop now
                throw new Error(body.message);
            }

            return callback(err, body);
        });
    };

    return {
        heartbeat: function (callback) {
            makeRequest(false, baseUrl, 'GET', callback);
        },
        pack: function (name, version, callback) {
            if (version && !callback) {
                makeRequest(false, makeUrl('pack/' + name), 'GET', version);
            } else {
                makeRequest(false, makeUrl('pack/' + name + '/' + version), 'GET', callback);
            }
        },
        packs: {
            simple: function (callback) {
                makeRequest(false, makeUrl('packs/simple'), 'GET', callback);
            },
            full: {
                all: function (callback) {
                    makeRequest(false, makeUrl('packs/full/all'), 'GET', callback);
                },
                public: function (callback) {
                    makeRequest(false, makeUrl('packs/full/public'), 'GET', callback);
                },
                semipublic: function (callback) {
                    makeRequest(false, makeUrl('packs/full/semipublic'), 'GET', callback);
                },
                private: function (callback) {
                    makeRequest(false, makeUrl('packs/full/private'), 'GET', callback);
                }
            }
        },
        stats: {
            downloads: {
                all: function (callback) {
                    makeRequest(false, makeUrl('stats/downloads/all'), 'GET', callback);
                },
                exe: function (callback) {
                    makeRequest(false, makeUrl('stats/downloads/exe'), 'GET', callback);
                },
                jar: function (callback) {
                    makeRequest(false, makeUrl('stats/downloads/jar'), 'GET', callback);
                },
                zip: function (callback) {
                    makeRequest(false, makeUrl('stats/downloads/zip'), 'GET', callback);
                }
            }
        },
        admin: {
            packs: function (callback) {
                makeRequest(true, makeUrl('admin/packs'), 'GET', callback);
            },
            pack: {
                info: function (pack, callback) {
                    makeRequest(true, makeUrl('admin/pack/' + pack), 'GET', callback);
                },
                file: {
                    delete: function (pack, folder, filename, callback) {
                        makeRequest(true, makeUrl('admin/pack/' + pack + '/file/' + folder + '/' + filename), 'DELETE', callback);
                    },
                    download: function (pack, folder, filename, saveTo, callback) {
                        makeRequest(true, makeUrl('admin/pack/' + pack + '/file/' + folder + '/' + filename), 'GET', function (err, res) {
                            if (saveTo && !callback) {
                                callback = saveTo;

                                return callback(err, res);
                            }

                            saveToFile(err, res, saveTo, true, callback);
                        });

                    },
                    put: function (pack, folder, filename, file, callback) {
                        fs.readFile(file, 'utf-8', function (err, data) {
                            if (err) {
                                return callback(err);
                            }

                            makeRequest(true, makeUrl('admin/pack/' + pack + '/file/' + folder + '/' + filename), 'PUT', {data: new Buffer(data).toString('base64')}, callback);
                        });
                    }
                },
                files: function (pack, folder, callback) {
                    makeRequest(true, makeUrl('admin/pack/' + pack + '/files/' + folder), 'GET', callback);
                },
                version: {
                    info: function (pack, version, callback) {
                        makeRequest(true, makeUrl('admin/pack/' + pack + '/versions/' + version), 'GET', callback);
                    },
                    xml: {
                        get: function (pack, version, saveTo, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/versions/' + version + '/xml'), 'GET', function (err, res) {
                                if (saveTo && !callback) {
                                    callback = saveTo;

                                    return callback(err, res);
                                }

                                saveToFile(err, res, saveTo, callback);
                            });
                        },
                        put: function (pack, version, file, callback) {
                            fs.readFile(file, 'utf-8', function (err, data) {
                                if (err) {
                                    return callback(err);
                                }

                                makeRequest(true, makeUrl('admin/pack/' + pack + '/versions/' + version + '/xml'), 'PUT', {data: data}, callback);
                            });
                        }
                    },
                    json: {
                        get: function (pack, version, saveTo, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/versions/' + version + '/json'), 'GET', function (err, res) {
                                if (saveTo && !callback) {
                                    callback = saveTo;

                                    return callback(err, res);
                                }

                                saveToFile(err, res, saveTo, callback);
                            });
                        }
                    },
                    configs: {
                        get: function (pack, version, saveTo, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/versions/' + version + '/configs'), 'GET', function (err, res) {
                                if (saveTo && !callback) {
                                    callback = saveTo;

                                    return callback(err, res);
                                }

                                saveToFile(err, res, saveTo, true, callback);
                            });
                        },
                        put: function (pack, version, file, callback) {
                            fs.readFile(file, 'utf-8', function (err, data) {
                                if (err) {
                                    return callback(err);
                                }

                                makeRequest(true, makeUrl('admin/pack/' + pack + '/versions/' + version + '/configs'), 'PUT', {data: new Buffer(data).toString('base64')}, callback);
                            });
                        }
                    }
                },
                settings: {
                    allowedplayers: {
                        add: function (pack, usernames, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/settings/allowedplayers'), 'POST', usernames, callback);
                        },
                        delete: function (pack, players, callback) {
                            if (players && !callback) {
                                callback = players;
                                players = false;
                            }

                            makeRequest(true, makeUrl('admin/pack/' + pack + '/settings/allowedplayers'), 'DELETE', (players ? players : []), callback);
                        },
                        get: function (pack, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/settings/allowedplayers'), 'GET', callback);
                        },
                        set: function (pack, version, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/settings/allowedplayers'), 'GET', callback);
                        }
                    },
                    testers: {
                        add: function (pack, usernames, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/settings/testers'), 'POST', usernames, callback);
                        },
                        delete: function (pack, players, callback) {
                            if (players && !callback) {
                                callback = players;
                                players = false;
                            }

                            makeRequest(true, makeUrl('admin/pack/' + pack + '/settings/testers'), 'DELETE', (players ? players : []), callback);
                        },
                        get: function (pack, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/settings/testers'), 'GET', callback);
                        },
                        set: function (pack, version, callback) {
                            makeRequest(true, makeUrl('admin/pack/' + pack + '/settings/testers'), 'GET', callback);
                        }
                    }
                }
            }
        }
    };
};