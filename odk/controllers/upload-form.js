const fs = require('fs');
const multiparty = require('multiparty');
const PythonShell = require('python-shell');

const settings = require('../../settings');
const formsDir = settings.publicDir + '/forms/';

/**
 * User uploads an XLSForm (Excel ODK Form).
 * XLSForms are converted to XForm with pyxform, and both
 * the XLS and XForm files are written to the forms directory.
 *
 * The XLS file should be in the `xls_file` field of the form-data.
 */
module.exports = function (req, res, next) {

    form = new multiparty.Form();
    form.parse(req, function (err, fields, files) {
        var file = files.xls_file;
        if (!file) {
            res.status(400).json({
                status: 400,
                msg: 'You must POST form-data with a key of "xls_file" and a value of an XLS Excel file.'
            });
            return;
        }

        // We move the XLSForm from temp to the forms directory.
        var xlsFilename = file[0].originalFilename;
        var xlsPath = formsDir + xlsFilename;
        fs.rename(file[0].path, xlsPath, function(err) {
            if (err) {
                res.status(400).json({
                    status: 400,
                    err: err,
                    msg: 'Unable to move ' + xlsFilename + ' to the forms directory.'
                });
                return;
            }

            // Convert XLS to XForm with pyxform
            var xFormFilename = xlsFilename.replace('.xlsx', '.xml');
            var xFormPath = formsDir + xFormFilename;
            var options = {
                scriptPath: __dirname + '/../pyxform/pyxform/',
                args: [xlsPath, xFormPath],
                mode: "text"
            };
            PythonShell.run('xls2xform.py', options, function (err, results) {
                if (err) {
                    res.status(400).json({
                        status: 400,
                        err: err,
                        msg: 'Unable to convert ' + xlsFilename + ' to an XForm.'
                    });
                    return;
                }

                res.status(201).json({
                    status: 201,
                    msg: 'Converted ' + file[0].originalFilename + 'to an XForm and saved both to the forms directory.',
                    xFormUrl: req.protocol + '://' + req.headers.host + '/public/forms/' + xFormFilename,
                    xlsFormUrl: req.protocol + '://' + req.headers.host + '/public/forms/' + xlsFilename
                });

            });
        });
    });
};
