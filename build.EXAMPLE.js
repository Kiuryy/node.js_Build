/**
 *
 * THIS IS AN EXAMPLE BUILD SCRIPT, WHICH USES THE FUNCTIONS OF funcs.js
 *
 */
(() => {
    "use strict";

    /* eslint-disable no-console */
    /* global Func, path */

    global.modulePath = __dirname + "/node_modules/";

    try {
        require("../node.js_Build/funcs");
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
        }
        console.error("Build script is missing. Please download from https://github.com/Kiuryy/node.js_Build");
        process.exit(1);
    }

    /**
     *
     * @type {Object}
     */
    let packageJson = {};

    /**
     * Starts building the application
     */
    const Build = () => {
        const start = +new Date();
        console.log("Building release...\n");

        loadPackageJson().then(() => {
            return Func.cleanPre();
        }).then(() => {
            return eslintCheck();
        }).then(() => {
            return remoteJs();
        }).then(() => {
            return js();
        }).then(() => {
            return css();
        }).then(() => {
            return img();
        }).then(() => {
            return json();
        }).then(() => {
            return html();
        }).then(() => {
            return zip();
        }).then(() => {
            return Func.cleanPost();
        }).then(() => {
            console.log("\nRelease built successfully\t[" + (+new Date() - start) + " ms]");
        });
    };

    /*
     * ################################
     * BUILD FUNCTIONS
     * ################################
     */

    /**
     * Read the package.json of the project and parse its JSON content into an object
     *
     * @returns {*}
     */
    const loadPackageJson = () => {
        return Func.measureTime((resolve) => {
            const fs = require("fs");

            const rawData = fs.readFileSync("package.json");
            const parsedData = JSON.parse(rawData);

            if (parsedData) {
                packageJson = parsedData;
                packageJson.preamble = `(c) ${packageJson.author} under ${packageJson.license}`;
                resolve();
            } else {
                console.error("Could not load package.json");
                process.exit(1);
            }
        }, "Loaded package.json");
    };

    /**
     * Copies the images to the dist directory
     *
     * @returns {Promise}
     */
    const img = () => {
        return Func.measureTime((resolve) => {
            Func.copy([path.src + "img/**/*"], [path.src + "**/*.xcf"], path.dist, false).then(() => {
                resolve();
            });
        }, "Moved image files to dist directory");
    };

    /**
     * Parses the scss files and copies the css files to the dist directory
     *
     * @returns {Promise}
     */
    const css = () => {
        return Func.measureTime((resolve) => {
            Func.minify([ // parse scss files
                path.src + "scss/*.scss"
            ], path.dist + "css/").then(() => {
                resolve();
            });
        }, "Moved css files to dist directory");
    };

    /**
     * Parses the js files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const js = () => {
        return Func.measureTime((resolve) => {
            Func.minify([
                path.src + "js/lib/jsu.js",
            ], path.dist + "js/lib/").then(() => {
                resolve();
            });
        }, "Moved js files to dist directory");
    };

    /**
     * Retrieves the newest versions of the lib js files from Github
     *
     * @returns {Promise}
     */
    const remoteJs = () => {
        return new Promise((resolve) => {
            let i = 0;
            const files = [
                {
                    file: "colorpicker.js",
                    urlPath: "colorpicker.js/master/src/js/colorpicker.js"
                },
                {
                    file: "jsu.js",
                    urlPath: "jsu.js/master/src/js/jsu.js"
                }
            ];

            const fetched = () => {
                i++;
                if (i === files.length) {
                    resolve();
                }
            };

            files.forEach((obj) => {
                Func.measureTime((rslv) => {
                    Func.getRemoteContent("https://raw.githubusercontent.com/Kiuryy/" + obj.urlPath).then((content) => {
                        Func.createFile(path.src + "js/lib/" + obj.file, content).then(() => {
                            rslv();
                        });
                    }, rslv);
                }, "Fetched " + obj.file + " from Github").then(() => {
                    fetched();
                });
            });
        });
    };

    /**
     * Parses the html files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const html = () => {
        return Func.measureTime((resolve) => {
            Func.minify([path.src + "html/**/*.html"], path.dist, false).then(() => {
                resolve();
            });
        }, "Moved html files to dist directory");
    };

    /**
     * Generate zip file from dist directory
     *
     * @returns {Promise}
     */
    const zip = () => {
        return Func.measureTime((resolve) => {
            Func.zipDirectory(path.dist, packageJson.name + "_" + packageJson.versionName + ".zip").then(resolve);
        }, "Created zip file from dist directory");
    };

    /**
     * Parses the json files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const json = () => {
        return Func.measureTime((resolve) => {
            Func.minify([path.src + "manifest.json"], path.dist, false).then(() => {
                resolve();
            });
        }, "Moved json files to dist directory");
    };

    /**
     * Performs eslint checks for the build and src/js directories
     *
     * @returns {Promise}
     */
    const eslintCheck = async () => {
        for (const files of ["build.js", path.src + "js/**/*.js"]) {
            await Func.measureTime(async (resolve) => {
                Func.cmd("eslint --fix " + files).then((obj) => {
                    if (obj.stdout && obj.stdout.trim().length > 0) {
                        console.error(obj.stdout);
                        process.exit(1);
                    }
                    resolve();
                });
            }, "Performed eslint check for " + files);
        }
    };

    //
    //
    //
    Build();
})();