import * as fs from "fs";
import * as handlebars from "handlebars";
import * as path from "path";
import * as vscode from "vscode";

import { SubmissionResultReport, TmcLangsTestResult } from "../api/types";
import Resources from "../config/resources";
import { numbersToString } from "../utils";

export default class TemplateEngine {
    private cssPath: string;
    private htmlPath: string;
    private cache: Map<string, HandlebarsTemplateDelegate<any>>;

    constructor(resources: Resources) {
        this.cssPath = resources.cssFolder;
        this.htmlPath = resources.htmlFolder;
        this.cache = new Map();
        /**
         * Logo path for organizations
         */
        handlebars.registerHelper("resolve_logo_path", (logoPath: string) => {
            return (!logoPath.endsWith("missing.png"))
                ? `https://tmc.mooc.fi${logoPath}`
                : "https://tmc.mooc.fi/logos/small_logo/missing.png";
        });

        /**
         * Checks the locally runned test status.
         */
        handlebars.registerHelper("check_test_status",
            (status: string, logs: { stdout: number[], stderr: number[] }) => {
                if (status === "PASSED") {
                    return "<h1 class='passed-header'>PASSED</h1><input type='button' value='Submit to server' class='btn-primary' onclick='submitToServer()' />";
                } else if (status === "TESTS_FAILED") {
                    return "<h1>TESTS FAILED</h1>";
                } else if (status === "COMPILE_FAILED") {
                    return `<h1>COMPILE FAILED</h1><pre>${numbersToString(logs.stdout)}</pre>`;
                } else {
                    return "<h1>Something went seriously wrong while running the tests</h1>";
                }
            });

        /**
         * Submission result show correct heading or compilation error
         */
        handlebars.registerHelper("submission_status", (results: SubmissionResultReport) => {
            if (results.status === "ok" && results.all_tests_passed) {
                return "<h1 class='passed-header'>All tests passed on the server</h1><input type='button' class='btn-primary' value='View model solution' onclick='viewModelSolution()' />";
            } else if (results.status === "fail") {
                return `<h1>Some tests failed on the server</h1>`;
            } else if (results.status === "error") {
                return `<h1>Server returned following error:
                        <pre style="font-size: 14px">${results.error}</pre>`;
            }
        });

        /**
         * Progress bar for running tests and submission.
         */
        handlebars.registerHelper("progress_bar", (exercises: TmcLangsTestResult[]) => {
            const length = exercises.length;
            let passedAmount = 0;
            for (const exer of exercises) {
                if (exer.successful) {
                    passedAmount = passedAmount + 1;
                }
            }
            passedAmount = Math.round((passedAmount / length * 100));
            const notPassed = 100 - passedAmount;
            return `<div class="progress" style="width: 100%">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${passedAmount}%" aria-valuenow="${passedAmount}" aria-valuemin="0" aria-valuemax="100">
                            ${passedAmount} %
                        </div>
                        <div class="progress-bar bg-danger" role="progressbar" style="width: ${notPassed}%" aria-valuenow="${notPassed}" aria-valuemin="0" aria-valuemax="100">
                            ${passedAmount === 0 ? "0 %" : ""}
                        </div>
                    </div>`;
        });

        /**
         * Returns the progress of submission status from TMC server
         */
        handlebars.registerHelper("check_submission_status", (status: string) => {
            let percentDone = 0;
            if (status === "created") {
                percentDone = 30;
                return `<div class="progress">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="${percentDone}" aria-valuemin="0" aria-valuemax="100" style="width: ${percentDone}%"></div>
                        </div>
                        <div>&#10004; Submission received. Waiting for it to be processed.</div>`;
            } else if (status === "sending_to_sandbox") {
                percentDone = 45;
                return `<div class="progress">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="${percentDone}" aria-valuemin="0" aria-valuemax="100" style="width: ${percentDone}%"></div>
                        </div>
                        <div>&#10004; Submission received. Waiting for it to be processed.</div><div>Submission queued for processing.</div>`;
            } else if (status === "processing_on_sandbox") {
                percentDone = 75;
                return `<div class="progress">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="${percentDone}" aria-valuemin="0" aria-valuemax="100" style="width: ${percentDone}%"></div>
                        </div>
                        <div>&#10004; Submission received. Waiting for it to be processed.</div>
                        <div>&#10004; Submission in queue for processing.</div>
                        <div>Testing submission.</div>`;
            } else {
                return `<div class="progress">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="${percentDone}" aria-valuemin="0" aria-valuemax="100" style="width: ${percentDone}%"></div>
                        </div>
                        <div>Submission sent to server.</div>`;
            }
        });
    }

    /**
     * Creates an HTML document from a template, with a default CSS applied
     *
     * @param extensionContext
     * @param name Name of the template file to user
     * @param data Must contain all the variables used in the template
     *
     * @returns The HTML document as a string
     */
    public async getTemplate(webview: vscode.Webview, name: string, data?: any): Promise<string> {

        const p = path.join(this.htmlPath, `${name}.html`);
        let template: HandlebarsTemplateDelegate<any>;
        const cacheResult = this.cache.get(name);
        if (cacheResult) {
            template = cacheResult;
        } else {
            template = handlebars.compile(fs.readFileSync(p, "utf8"));
        }
        if (!data) {
            data = {};
        }
        data.cssPath = webview.asWebviewUri(vscode.Uri.file(path.join(this.cssPath, "style.css")));
        data.bootstrapPath = webview.asWebviewUri(vscode.Uri.file(path.join(this.cssPath, "bootstrap.min.css")));

        console.log(data);

        return template(data);
    }

}
