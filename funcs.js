(() => {
    "use strict";

    if (typeof modulePath === "undefined") {
        console.error("Path to modules is not specified. Please define a variable 'modulePath'");
        process.exit(1);
    }

    global.path = {
        src: "src/",
        assets: "assets/",
        tmp: "__tmp/",
        dist: "__dist/"
    };

    global.Func = new function () {
        const requireModule = (m) => require(modulePath + m);

        /**

         "concat": "^1.0.3",
         "create-file": "^1.0.1",
         "del": "^4.1.1",
         "eslint": "^5.16.0",
         "fs-extra": "^8.0.1",
         "glob-concat": "^1.0.1",
         "html-minifier": "^4.0.0",
         "jsonminify": "^0.4.1",
         "node-sass": "^4.12.0",
         "npm-check-updates": "^3.1.9",
         "read-file": "^0.2.0",
         "request": "^2.88.0",
         "terser": "^4.0.0",
         "zip-dir": "^1.0.2"

         *
         * @type {object}
         */
        const module = {
            find: requireModule("glob-concat"),
            concat: requireModule("concat"),
            read: requireModule("read-file"),
            remove: requireModule("del"),
            createFile: requireModule("create-file"),
            minifyHtml: requireModule("html-minifier").minify,
            minifyJson: requireModule("jsonminify"),
            terser: requireModule("terser"),
            sass: requireModule("node-sass"),
            copy: requireModule("fs-extra").copy,
            request: requireModule("request"),
            zip: requireModule("zip-dir"),
            exec: require("child_process").exec
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Finds the files matching the given list of definitions (files, glob path, ...)
         *
         * @param {Array} files
         * @returns {Promise}
         */
        const find = (files) => {
            return new Promise((resolve) => {
                module.find.sync(files);
                module.find(files, (err, matches) => {
                    if (err) {
                        throw err;
                    }
                    resolve(matches);
                });
            });
        };

        /**
         * Reads the content of the given file
         *
         * @param {string} src
         * @returns {Promise}
         */
        const readFile = (src) => {
            return new Promise((resolve) => {
                module.read(src, {encoding: "utf8"}, (err, content) => {
                    if (err) {
                        throw err;
                    }
                    resolve(content);
                });
            });
        };

        /**
         * Determines the files matching the given definition and calls the given function for each of the files,
         * Waits until the callback function is runned before proceeding to the next file
         *
         * @param {Array} files
         * @param {boolean} flatten ignore the path of the given files and put them directly into the destination
         * @param {function} func
         * @returns {Promise}
         */
        const proceedFiles = (files, flatten = true, func) => {
            return new Promise((resolve) => {
                find(files).then((matches) => {
                    const proceed = (i = 0) => { // will be called once the previous minify process is done -> important to keep the correct order
                        if (matches[i]) {
                            const info = {
                                file: matches[i],
                                fileName: matches[i].replace(new RegExp("^(" + path.src + "|" + path.tmp + ")", "i"), "")
                            };

                            if (flatten) {
                                info.fileName = info.fileName.split(/\//).pop();
                            }

                            if (info.fileName.search(/\./) > -1) { // only proceed files
                                info.ext = info.fileName.split(/\./).pop();

                                new Promise((rslv) => {
                                    func(info, rslv);
                                }).then(() => {
                                    proceed(i + 1);
                                });
                            } else {
                                proceed(i + 1);
                            }
                        } else {
                            resolve();
                        }
                    };

                    proceed();
                });
            });
        };

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.cmd = (command) => {
            return new Promise((resolve) => {
                if (typeof command === "object") {
                    command = command.join("&&");
                }

                module.exec(command, (error, stdout, stderr) => {
                    resolve({
                        stdout: stdout,
                        stderr: stderr
                    });
                });
            });
        };

        /**
         * Creates a zip file containing all files of the given directory
         *
         * @param {string} dir
         * @param {string} dest
         * @returns {Promise}
         */
        this.zipDirectory = (dir, dest) => {
            return new Promise((resolve, reject) => {
                module.zip(dir, {saveTo: dest}, (err) => {
                    if (err) {
                        reject();
                    } else {
                        resolve();
                    }
                });
            });
        };

        /**
         * Removes the content of the tmp and dist directory
         *
         * @returns {Promise}
         */
        this.cleanPre = () => {
            return this.measureTime((resolve) => {
                this.remove([path.tmp + "*", path.dist + "*", "*.zip"]).then(() => {
                    return this.createFile(path.tmp + "info.txt", new Date().toISOString());
                }).then(() => {
                    resolve();
                });
            }, "Cleaned tmp and dist directories");
        };

        /**
         * Removes the tmp directory
         *
         * @returns {Promise}
         */
        this.cleanPost = () => {
            return this.measureTime((resolve) => {
                this.remove([path.tmp]).then(() => {
                    resolve();
                });
            }, "Cleaned tmp directory");
        };

        /**
         *
         * @param {function} func
         * @param {string} msg
         * @returns {Promise}
         */
        this.measureTime = (func, msg) => {
            return new Promise((resolve) => {
                const start = +new Date();
                new Promise(func).then((info) => {
                    const timeInfo = "[" + (+new Date() - start) + " ms]";
                    console.log(" - " + timeInfo + "" + (" ".repeat(10 - timeInfo.length)) + msg + (info ? (" -> " + info) : ""));
                    resolve();
                });
            });
        };

        /**
         * Creates a file with the given content
         *
         * @param {string} src
         * @param {string} content
         * @returns {Promise}
         */
        this.createFile = (src, content) => {
            return new Promise((resolve) => {
                this.remove([src]).then(() => { // remove existing file
                    setTimeout(() => {
                        module.createFile(src, content, (err) => { // create file with given content
                            if (err) {
                                throw err;
                            }
                            resolve();
                        });
                    }, 100);
                });
            });
        };

        /**
         * Replaces the given definitions in the content of the given files
         *
         * @param {object} files
         * @param {Array} replaces
         * @returns {Promise}
         */
        this.replace = (files, replaces) => {
            return new Promise((resolve) => {
                Object.keys(files).forEach((src) => {
                    readFile(src).then((content) => { // read file
                        replaces.forEach((replace) => { // replace the definitions
                            content = content.replace(replace[0], replace[1]);
                        });

                        return this.createFile(files[src], content); // save file with new content
                    }).then(() => {
                        resolve();
                    });
                });
            });
        };

        /**
         * Removes the given files
         *
         * @param {Array} files
         * @returns {Promise}
         */
        this.remove = (files) => {
            return new Promise((resolve) => {
                module.remove(files).then(() => {
                    resolve();
                });
            });
        };

        /**
         * Merges the content of the given files into one output file
         *
         * @param {Array} files
         * @param {string} output
         * @returns {Promise}
         */
        this.concat = (files, output) => {
            return new Promise((resolve) => {
                find(files).then((matches) => {
                    return module.concat(matches, output);
                }).then(() => {
                    resolve();
                });
            });
        };

        /**
         * Copies the given files in the given destination
         *
         * @param {Array} files
         * @param {Array} exclude
         * @param {string} dest
         * @param {boolean} flatten ignore the path of the given files and put them directly into the destination
         * @returns {Promise}
         */
        this.copy = (files, exclude, dest, flatten = true) => {
            return new Promise((resolve) => {
                find(exclude).then((exludeList) => {
                    return proceedFiles(files, flatten, (info, rslv) => {
                        if (exludeList.indexOf(info.file) === -1) { // not excluded -> copy file
                            module.copy(info.file, dest + info.fileName).then(() => {
                                rslv();
                            });
                        } else { // excluded -> don't copy
                            rslv();
                        }
                    });
                }).then(() => {
                    resolve();
                });
            });
        };

        /**
         * Returns the content of the given url
         *
         * @param {string} url
         * @returns {Promise}
         */
        this.getRemoteContent = (url) => {
            return new Promise((resolve, reject) => {
                module.request({
                    url: url,
                    timeout: 5000,
                    method: "GET"
                }, (error, response, body) => {
                    if (error === null && body && body.length > 0) {
                        resolve(body);
                    } else {
                        reject();
                    }
                });
            });
        };

        /**
         * Minifies the given files and puts them in the given destination
         *
         * @param {Array} files
         * @param {string} dest
         * @param {boolean} flatten ignore the path of the given files and put them directly into the destination
         * @returns {Promise}
         */
        this.minify = (files, dest, flatten = true) => {
            return new Promise((resolve) => {
                proceedFiles(files, flatten, (info, rslv) => {
                    readFile(info.file).then((content) => { // read file
                        switch (info.ext) {
                            case "html": {
                                content = module.minifyHtml(content, { // minify content
                                    collapseWhitespace: true,
                                    removeComments: true,
                                    keepClosingSlash: true,
                                    minifyCSS: true
                                });
                                break;
                            }
                            case "json": {
                                content = module.minifyJson(content);
                                break;
                            }
                            case "js": {
                                const result = module.terser.minify(content, {
                                    output: {
                                        preamble: "/*! (c) " + process.env.npm_package_author_name + " under " + process.env.npm_package_license + " */"
                                    },
                                    mangle: {
                                        reserved: ["jsu", "chrome"]
                                    }
                                });
                                if (result.error) {
                                    throw result.error;
                                }
                                content = result.code;
                                break;
                            }
                            case "scss": {
                                const result = module.sass.renderSync({
                                    data: content,
                                    outputStyle: "compressed",
                                    includePaths: [path.src + "scss", path.assets + "scss"]
                                });
                                content = result.css;
                                info.fileName = info.fileName.replace(/\.scss$/, ".css");
                                break;
                            }
                        }

                        return this.createFile(dest + info.fileName, content); // save file in the output directory
                    }).then(() => {
                        rslv();
                    });
                }).then(() => {
                    resolve();
                });
            });
        };
    };

})();