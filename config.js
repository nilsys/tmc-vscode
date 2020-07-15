//@ts-check
"use strict";

/**@type {import("webpack").DefinePlugin.CodeValueObject}*/
const localApi = {
    __ACCESS_TOKEN_URI__: JSON.stringify("http://localhost:4001/oauth/token"),
    __TMC_API_URL__: JSON.stringify("http://localhost:4001/"),
    __TMC_JAR_NAME__: JSON.stringify("tmc-langs-cli-0.8.5-SNAPSHOT.jar"),
    __TMC_JAR_URL__: JSON.stringify("http://localhost:4001/langs"),
    __TMC_LANGS_RUST_DL_URL__: JSON.stringify("http://localhost:4001/langs/"),
    __TMC_LANGS_RUST_VERSION__: JSON.stringify("0.1.3-alpha"),
};

/**@type {import("webpack").DefinePlugin.CodeValueObject}*/
const productionApi = {
    __ACCESS_TOKEN_URI__: JSON.stringify("https://tmc.mooc.fi/oauth/token"),
    __TMC_API_URL__: JSON.stringify("https://tmc.mooc.fi/api/v8/"),
    __TMC_JAR_NAME__: JSON.stringify("tmc-langs-cli-0.8.5-SNAPSHOT.jar"),
    __TMC_JAR_URL__: JSON.stringify(
        "https://download.mooc.fi/tmc-langs/tmc-langs-cli-0.8.5-SNAPSHOT.jar",
    ),
    __TMC_LANGS_RUST_DL_URL__: JSON.stringify("https://download.mooc.fi/tmc-langs-rust/"),
    __TMC_LANGS_RUST_VERSION__: JSON.stringify("0.1.5-alpha"),
};

module.exports = { localApi, productionApi };
