import http from "node:http";
import { pathToFileURL } from "node:url";
import nodeCrypto, { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
// \0rolldown/runtime.js
var __defProp$1 = Object.defineProperty;
var __esmMin = (fn, res, err) => () => {
	if (err) throw err[0];
	try {
		return fn && (res = fn(fn = 0)), res;
	} catch (e) {
		throw err = [e], e;
	}
};
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp$1(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp$1(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
// node_modules/uncrypto/dist/crypto.node.mjs
var subtle;
var init_crypto_node = __esmMin((() => {
	subtle = nodeCrypto.webcrypto?.subtle || {};
}));
// node_modules/@upstash/redis/chunk-2JFYL2VL.mjs
function parseRecursive(obj) {
	const parsed = Array.isArray(obj) ? obj.map((o) => {
		try {
			return parseRecursive(o);
		} catch {
			return o;
		}
	}) : JSON.parse(obj);
	if (typeof parsed === "number" && parsed.toString() !== obj) return obj;
	return parsed;
}
function parseResponse(result) {
	try {
		return parseRecursive(result);
	} catch {
		return result;
	}
}
function deserializeScanResponse(result) {
	return [result[0], ...parseResponse(result.slice(1))];
}
function deserializeScanWithTypesResponse(result) {
	const [cursor, keys] = result;
	const parsedKeys = [];
	for (let i = 0; i < keys.length; i += 2) parsedKeys.push({
		key: keys[i],
		type: keys[i + 1]
	});
	return [cursor, parsedKeys];
}
function mergeHeaders(...headers) {
	const merged = {};
	for (const header of headers) {
		if (!header) continue;
		for (const [key, value] of Object.entries(header)) if (value !== void 0 && value !== null) merged[key] = value;
	}
	return merged;
}
function kvArrayToObject(v) {
	if (typeof v === "object" && v !== null && !Array.isArray(v)) return v;
	if (!Array.isArray(v)) return {};
	const obj = {};
	for (let i = 0; i < v.length; i += 2) if (typeof v[i] === "string") obj[v[i]] = v[i + 1];
	return obj;
}
function base64decode(b64) {
	let dec = "";
	try {
		const binString = atob(b64);
		const size = binString.length;
		const bytes = new Uint8Array(size);
		for (let i = 0; i < size; i++) bytes[i] = binString.charCodeAt(i);
		dec = new TextDecoder().decode(bytes);
	} catch {
		dec = b64;
	}
	return dec;
}
function decode(raw) {
	let result = void 0;
	switch (typeof raw) {
		case "undefined": return raw;
		case "number":
			result = raw;
			break;
		case "object":
			if (Array.isArray(raw)) result = raw.map((v) => typeof v === "string" ? base64decode(v) : Array.isArray(v) ? v.map((element) => decode(element)) : v);
			else result = null;
			break;
		case "string": result = raw === "OK" ? "OK" : base64decode(raw);
	}
	return result;
}
function merge(obj, key, value) {
	if (!value) return obj;
	if (!obj[key]) {
		obj[key] = value;
		return obj;
	}
	if (!obj[key].split(",").map((v) => v.trim()).includes(value.trim())) obj[key] = [obj[key], value].join(",");
	return obj;
}
function isFieldType(value) {
	return typeof value === "string" && FIELD_TYPES.includes(value);
}
function isDetailedField(value) {
	return typeof value === "object" && value !== null && "type" in value && isFieldType(value.type);
}
function isNestedSchema(value) {
	return typeof value === "object" && value !== null && !isDetailedField(value);
}
function flattenSchema(schema, pathPrefix = []) {
	const fields = [];
	for (const [key, value] of Object.entries(schema)) {
		const currentPath = [...pathPrefix, key];
		const pathString = currentPath.join(".");
		if (isFieldType(value)) fields.push({
			path: pathString,
			type: value
		});
		else if (isDetailedField(value)) fields.push({
			path: pathString,
			type: value.type,
			fast: "fast" in value ? value.fast : void 0,
			noTokenize: "noTokenize" in value ? value.noTokenize : void 0,
			noStem: "noStem" in value ? value.noStem : void 0,
			from: "from" in value ? value.from : void 0
		});
		else if (isNestedSchema(value)) {
			const nestedFields = flattenSchema(value, currentPath);
			fields.push(...nestedFields);
		}
	}
	return fields;
}
function deserializeQueryResponse(rawResponse) {
	return rawResponse.map((itemRaw) => {
		const raw = itemRaw;
		const key = raw[0];
		const score = Number(raw[1]);
		const rawFields = raw[2];
		if (rawFields === void 0) return {
			key,
			score
		};
		if (!Array.isArray(rawFields) || rawFields.length === 0) return {
			key,
			score,
			data: {}
		};
		let data = {};
		for (const fieldRaw of rawFields) {
			const key2 = fieldRaw[0];
			const value = fieldRaw[1];
			const pathParts = key2.split(".");
			if (pathParts.length === 1) data[key2] = value;
			else {
				let currentObj = data;
				for (let i = 0; i < pathParts.length - 1; i++) {
					const pathPart = pathParts[i];
					if (!(pathPart in currentObj)) currentObj[pathPart] = {};
					currentObj = currentObj[pathPart];
				}
				currentObj[pathParts.at(-1)] = value;
			}
		}
		if ("$" in data) data = data["$"];
		return {
			key,
			score,
			data
		};
	});
}
function deserializeDescribeResponse(rawResponse) {
	const description = {};
	for (let i = 0; i < rawResponse.length; i += 2) switch (rawResponse[i]) {
		case "name":
			description["name"] = rawResponse[i + 1];
			break;
		case "type":
			description["dataType"] = rawResponse[i + 1].toLowerCase();
			break;
		case "prefixes":
			description["prefixes"] = rawResponse[i + 1];
			break;
		case "language":
			description["language"] = rawResponse[i + 1];
			break;
		case "schema": {
			const schema = {};
			for (const fieldDescription of rawResponse[i + 1]) {
				const fieldName = fieldDescription[0];
				const fieldInfo = { type: fieldDescription[1] };
				if (fieldDescription.length > 2) for (let j = 2; j < fieldDescription.length; j++) switch (fieldDescription[j]) {
					case "NOSTEM":
						fieldInfo.noStem = true;
						break;
					case "NOTOKENIZE":
						fieldInfo.noTokenize = true;
						break;
					case "FAST":
						fieldInfo.fast = true;
						break;
					case "FROM": fieldInfo.from = fieldDescription[++j];
				}
				schema[fieldName] = fieldInfo;
			}
			description["schema"] = schema;
			break;
		}
	}
	return description;
}
function parseCountResponse(rawResponse) {
	return typeof rawResponse === "number" ? rawResponse : Number.parseInt(rawResponse, 10);
}
function deserializeAggregateResponse(rawResponse) {
	return parseAggregationArray(rawResponse);
}
function parseAggregationArray(arr) {
	const result = {};
	for (let i = 0; i < arr.length; i += 2) {
		const key = arr[i];
		const value = arr[i + 1];
		if (Array.isArray(value)) {
			if (value.length > 0 && typeof value[0] === "string") result[key] = value[0] === "buckets" ? parseBucketsValue(value) : parseStatsValue(value);
			else result[key] = parseAggregationArray(value);
		} else result[key] = value;
	}
	return result;
}
function coerceNumericString(value) {
	if (typeof value === "string" && value !== "" && !Number.isNaN(Number(value))) return Number(value);
	return value;
}
function parseStatsValue(arr) {
	const result = {};
	for (let i = 0; i < arr.length; i += 2) {
		const key = arr[i];
		const value = arr[i + 1];
		if (Array.isArray(value) && value.length > 0) {
			if (typeof value[0] === "string") result[key] = parseStatsValue(value);
			else if (Array.isArray(value[0]) && typeof value[0][0] === "string") result[key] = value.map((item) => parseStatsValue(item));
			else result[key] = value;
		} else result[key] = coerceNumericString(value);
	}
	return result;
}
function parseBucketsValue(arr) {
	if (arr[0] === "buckets" && Array.isArray(arr[1])) {
		const result = { buckets: arr[1].map((bucket) => {
			const bucketObj = {};
			for (let i = 0; i < bucket.length; i += 2) {
				const key = bucket[i];
				const value = bucket[i + 1];
				bucketObj[key] = Array.isArray(value) && value.length > 0 && typeof value[0] === "string" ? parseStatsValue(value) : value;
			}
			return bucketObj;
		}) };
		for (let i = 2; i < arr.length; i += 2) result[arr[i]] = arr[i + 1];
		return result;
	}
	return arr;
}
function buildQueryCommand(redisCommand, name, options) {
	const command = [
		redisCommand,
		name,
		JSON.stringify(options?.filter ?? {})
	];
	if (options?.limit !== void 0) command.push("LIMIT", options.limit.toString());
	if (options?.offset !== void 0) command.push("OFFSET", options.offset.toString());
	if (options?.select && Object.keys(options.select).length === 0) command.push("NOCONTENT");
	if (options) {
		if ("orderBy" in options && options.orderBy) {
			command.push("ORDERBY");
			for (const [field, direction] of Object.entries(options.orderBy)) command.push(field, direction);
		} else if ("scoreFunc" in options && options.scoreFunc) command.push("SCOREFUNC", ...buildScoreFunc(options.scoreFunc));
	}
	if (options?.highlight) {
		command.push("HIGHLIGHT", "FIELDS", options.highlight.fields.length.toString(), ...options.highlight.fields);
		if (options.highlight.preTag && options.highlight.postTag) command.push("TAGS", options.highlight.preTag, options.highlight.postTag);
	}
	if (options?.select && Object.keys(options.select).length > 0) command.push("SELECT", Object.keys(options.select).length.toString(), ...Object.keys(options.select));
	return command;
}
function buildScoreFunc(scoreBy) {
	const result = [];
	if (typeof scoreBy === "string") result.push("FIELDVALUE", scoreBy);
	else if ("fields" in scoreBy) {
		if (scoreBy.combineMode) result.push("COMBINEMODE", scoreBy.combineMode.toUpperCase());
		if (scoreBy.scoreMode) result.push("SCOREMODE", scoreBy.scoreMode.toUpperCase());
		for (const field of scoreBy.fields) result.push(...buildScoreFuncField(field));
	} else result.push(...buildScoreFuncField(scoreBy));
	return result;
}
function buildScoreFuncField(field) {
	const result = [];
	if (typeof field === "string") result.push("FIELDVALUE", field);
	else {
		if (field.scoreMode) result.push("SCOREMODE", field.scoreMode.toUpperCase());
		result.push("FIELDVALUE", field.field);
		if (field.modifier) result.push("MODIFIER", field.modifier.toUpperCase());
		if (field.factor !== void 0) result.push("FACTOR", field.factor.toString());
		if (field.missing !== void 0) result.push("MISSING", field.missing.toString());
	}
	return result;
}
function buildCreateIndexCommand(params) {
	const { name, schema, dataType, prefix, language, skipInitialScan, existsOk } = params;
	const prefixArray = Array.isArray(prefix) ? prefix : [prefix];
	const payload = [
		name,
		...skipInitialScan ? ["SKIPINITIALSCAN"] : [],
		...existsOk ? ["EXISTSOK"] : [],
		"ON",
		dataType.toUpperCase(),
		"PREFIX",
		prefixArray.length.toString(),
		...prefixArray,
		...language ? ["LANGUAGE", language] : [],
		"SCHEMA"
	];
	const fields = flattenSchema(schema);
	for (const field of fields) {
		payload.push(field.path, field.type);
		if (field.fast) payload.push("FAST");
		if (field.noTokenize) payload.push("NOTOKENIZE");
		if (field.noStem) payload.push("NOSTEM");
		if (field.from) payload.push("FROM", field.from);
	}
	return ["SEARCH.CREATE", ...payload];
}
function buildAggregateCommand(name, options) {
	return [
		"SEARCH.AGGREGATE",
		name,
		JSON.stringify(options?.filter ?? {}),
		JSON.stringify(options.aggregations)
	];
}
async function createIndex(client, params) {
	const { name, schema } = params;
	await new ExecCommand(buildCreateIndexCommand(params)).exec(client);
	return initIndex(client, {
		name,
		schema
	});
}
function initIndex(client, params) {
	const { name, schema } = params;
	return new SearchIndex({
		name,
		schema,
		client
	});
}
async function listAliases(client) {
	const rawResult = await new ExecCommand(["SEARCH.LISTALIASES"]).exec(client);
	if (rawResult === 0 || Array.isArray(rawResult) && rawResult.length === 0) return {};
	if (!Array.isArray(rawResult)) return {};
	const aliases = {};
	for (const pair of rawResult) if (Array.isArray(pair) && pair.length === 2) {
		const [alias, index] = pair;
		aliases[alias] = index;
	}
	return aliases;
}
async function addAlias(client, { indexName, alias }) {
	return await new ExecCommand([
		"SEARCH.ALIASADD",
		alias,
		indexName
	]).exec(client);
}
async function delAlias(client, { alias }) {
	return await new ExecCommand(["SEARCH.ALIASDEL", alias]).exec(client);
}
function deserialize(result) {
	if (result.length === 0) return null;
	const obj = {};
	for (let i = 0; i < result.length; i += 2) {
		const key = result[i];
		const value = result[i + 1];
		try {
			obj[key] = JSON.parse(value);
		} catch {
			obj[key] = value;
		}
	}
	return obj;
}
function deserialize2(result) {
	if (!Array.isArray(result)) return [];
	return result.map((libRaw) => {
		const lib = kvArrayToObject(libRaw);
		const functionsParsed = lib.functions.map((fnRaw) => kvArrayToObject(fnRaw));
		return {
			libraryName: lib.library_name,
			engine: lib.engine,
			functions: functionsParsed.map((fn) => ({
				name: fn.name,
				description: fn.description ?? void 0,
				flags: fn.flags
			})),
			libraryCode: lib.library_code
		};
	});
}
function deserialize3(result) {
	const rawEngines = kvArrayToObject(kvArrayToObject(result).engines);
	const parsedEngines = Object.fromEntries(Object.entries(rawEngines).map(([key, value]) => [key, kvArrayToObject(value)]));
	return { engines: Object.fromEntries(Object.entries(parsedEngines).map(([key, value]) => [key, {
		librariesCount: value.libraries_count,
		functionsCount: value.functions_count
	}])) };
}
function transform(result) {
	const final = [];
	for (const pos of result) {
		if (!pos?.[0] || !pos?.[1]) continue;
		final.push({
			lng: Number.parseFloat(pos[0]),
			lat: Number.parseFloat(pos[1])
		});
	}
	return final;
}
function deserialize4(result) {
	if (result.length === 0) return null;
	const obj = {};
	for (let i = 0; i < result.length; i += 2) {
		const key = result[i];
		const value = result[i + 1];
		try {
			obj[key] = !Number.isNaN(Number(value)) && !Number.isSafeInteger(Number(value)) ? value : JSON.parse(value);
		} catch {
			obj[key] = value;
		}
	}
	return obj;
}
function deserialize5(fields, result) {
	if (result.every((field) => field === null)) return null;
	const obj = {};
	for (const [i, field] of fields.entries()) try {
		obj[field] = JSON.parse(result[i]);
	} catch {
		obj[field] = result[i];
	}
	return obj;
}
function deserialize6(result) {
	const obj = {};
	for (const e of result) for (let i = 0; i < e.length; i += 2) {
		const streamId = e[i];
		const entries = e[i + 1];
		if (!(streamId in obj)) obj[streamId] = {};
		for (let j = 0; j < entries.length; j += 2) {
			const field = entries[j];
			const value = entries[j + 1];
			try {
				obj[streamId][field] = JSON.parse(value);
			} catch {
				obj[streamId][field] = value;
			}
		}
	}
	return obj;
}
function deserialize7(result) {
	const obj = {};
	for (const e of result) for (let i = 0; i < e.length; i += 2) {
		const streamId = e[i];
		const entries = e[i + 1];
		if (!(streamId in obj)) obj[streamId] = {};
		for (let j = 0; j < entries.length; j += 2) {
			const field = entries[j];
			const value = entries[j + 1];
			try {
				obj[streamId][field] = JSON.parse(value);
			} catch {
				obj[streamId][field] = value;
			}
		}
	}
	return obj;
}
function createAutoPipelineProxy(_redis, namespace = "root") {
	const redis = _redis;
	if (!redis.autoPipelineExecutor) redis.autoPipelineExecutor = new AutoPipelineExecutor(redis);
	return new Proxy(redis, { get: (redis2, command) => {
		if (command === "pipelineCounter") return redis2.autoPipelineExecutor.pipelineCounter;
		if (namespace === "root" && command === "json") return createAutoPipelineProxy(redis2, "json");
		if (namespace === "root" && command === "functions") return createAutoPipelineProxy(redis2, "functions");
		if (namespace === "root") {
			const commandInRedisButNotPipeline = command in redis2 && !(command in redis2.autoPipelineExecutor.pipeline);
			const isCommandExcluded = EXCLUDE_COMMANDS.has(command);
			if (commandInRedisButNotPipeline || isCommandExcluded) return redis2[command];
		}
		const pipeline = redis2.autoPipelineExecutor.pipeline;
		const targetFunction = namespace === "json" ? pipeline.json[command] : namespace === "functions" ? pipeline.functions[command] : pipeline[command];
		if (typeof targetFunction === "function") return (...args) => {
			const commandMode = READ_COMMANDS.has(command) ? "read" : "write";
			return redis2.autoPipelineExecutor.withAutoPipeline(commandMode, (pipeline2) => {
				(namespace === "json" ? pipeline2.json[command] : namespace === "functions" ? pipeline2.functions[command] : pipeline2[command])(...args);
			});
		};
		return targetFunction;
	} });
}
var __defProp, __export, error_exports, UpstashError, UrlError, UpstashJSONParseError, MAX_BUFFER_SIZE, HttpClient, defaultSerializer, Command, ExecCommand, FIELD_TYPES, SearchIndex, HRandFieldCommand, AppendCommand, BitCountCommand, BitFieldCommand, BitOpCommand, BitPosCommand, ClientSetInfoCommand, CopyCommand, DBSizeCommand, DecrCommand, DecrByCommand, DelCommand, EchoCommand, EvalROCommand, EvalCommand, EvalshaROCommand, EvalshaCommand, ExistsCommand, ExpireCommand, ExpireAtCommand, FCallCommand, FCallRoCommand, FlushAllCommand, FlushDBCommand, FunctionDeleteCommand, FunctionFlushCommand, FunctionListCommand, FunctionLoadCommand, FunctionStatsCommand, GeoAddCommand, GeoDistCommand, GeoHashCommand, GeoPosCommand, GeoSearchCommand, GeoSearchStoreCommand, GetCommand, GetBitCommand, GetDelCommand, GetExCommand, GetRangeCommand, GetSetCommand, HDelCommand, HExistsCommand, HExpireCommand, HExpireAtCommand, HExpireTimeCommand, HPersistCommand, HPExpireCommand, HPExpireAtCommand, HPExpireTimeCommand, HPTtlCommand, HGetCommand, HGetAllCommand, HMGetCommand, HGetDelCommand, HGetExCommand, HIncrByCommand, HIncrByFloatCommand, HKeysCommand, HLenCommand, HMSetCommand, HScanCommand, HSetCommand, HSetExCommand, HSetNXCommand, HStrLenCommand, HTtlCommand, HValsCommand, IncrCommand, IncrByCommand, IncrByFloatCommand, JsonArrAppendCommand, JsonArrIndexCommand, JsonArrInsertCommand, JsonArrLenCommand, JsonArrPopCommand, JsonArrTrimCommand, JsonClearCommand, JsonDelCommand, JsonForgetCommand, JsonGetCommand, JsonMergeCommand, JsonMGetCommand, JsonMSetCommand, JsonNumIncrByCommand, JsonNumMultByCommand, JsonObjKeysCommand, JsonObjLenCommand, JsonRespCommand, JsonSetCommand, JsonStrAppendCommand, JsonStrLenCommand, JsonToggleCommand, JsonTypeCommand, KeysCommand, LIndexCommand, LInsertCommand, LLenCommand, LMoveCommand, LmPopCommand, LPopCommand, LPosCommand, LPushCommand, LPushXCommand, LRangeCommand, LRemCommand, LSetCommand, LTrimCommand, MGetCommand, MSetCommand, MSetNXCommand, PersistCommand, PExpireCommand, PExpireAtCommand, PfAddCommand, PfCountCommand, PfMergeCommand, PingCommand, PSetEXCommand, PTtlCommand, PublishCommand, RandomKeyCommand, RenameCommand, RenameNXCommand, RPopCommand, RPushCommand, RPushXCommand, SAddCommand, ScanCommand, SCardCommand, ScriptExistsCommand, ScriptFlushCommand, ScriptLoadCommand, SDiffCommand, SDiffStoreCommand, SetCommand, SetBitCommand, SetExCommand, SetNxCommand, SetRangeCommand, SInterCommand, SInterCardCommand, SInterStoreCommand, SIsMemberCommand, SMembersCommand, SMIsMemberCommand, SMoveCommand, SPopCommand, SRandMemberCommand, SRemCommand, SScanCommand, StrLenCommand, SUnionCommand, SUnionStoreCommand, TimeCommand, TouchCommand, TtlCommand, TypeCommand, UnlinkCommand, XAckCommand, XAckDelCommand, XAddCommand, XAutoClaim, XClaimCommand, XDelCommand, XDelExCommand, XGroupCommand, XInfoCommand, XLenCommand, XPendingCommand, XRangeCommand, UNBALANCED_XREAD_ERR, XReadCommand, UNBALANCED_XREADGROUP_ERR, XReadGroupCommand, XRevRangeCommand, XTrimCommand, ZAddCommand, ZCardCommand, ZCountCommand, ZIncrByCommand, ZInterStoreCommand, ZLexCountCommand, ZPopMaxCommand, ZPopMinCommand, ZRangeCommand, ZRankCommand, ZRemCommand, ZRemRangeByLexCommand, ZRemRangeByRankCommand, ZRemRangeByScoreCommand, ZRevRankCommand, ZScanCommand, ZScoreCommand, ZUnionCommand, ZUnionStoreCommand, ZDiffStoreCommand, ZMScoreCommand, Pipeline, MAX_PIPELINE_SIZE, READ_COMMANDS, EXCLUDE_COMMANDS, AutoPipelineExecutor, PSubscribeCommand, Subscriber, SubscribeCommand, parseWithTryCatch, Script, ScriptRO, Redis, VERSION;
var init_chunk_2JFYL2VL = __esmMin((() => {
	init_crypto_node();
	__defProp = Object.defineProperty;
	__export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	error_exports = {};
	__export(error_exports, {
		UpstashError: () => UpstashError,
		UpstashJSONParseError: () => UpstashJSONParseError,
		UrlError: () => UrlError
	});
	UpstashError = class extends Error {
		constructor(message, options) {
			super(message, options);
			this.name = "UpstashError";
		}
	};
	UrlError = class extends Error {
		constructor(url) {
			super(`Upstash Redis client was passed an invalid URL. You should pass a URL starting with https. Received: "${url}". `);
			this.name = "UrlError";
		}
	};
	UpstashJSONParseError = class extends UpstashError {
		constructor(body, options) {
			const truncatedBody = body.length > 200 ? body.slice(0, 200) + "..." : body;
			super(`Unable to parse response body: ${truncatedBody}`, options);
			this.name = "UpstashJSONParseError";
		}
	};
	MAX_BUFFER_SIZE = 1048576;
	HttpClient = class {
		baseUrl;
		headers;
		options;
		readYourWrites;
		upstashSyncToken = "";
		hasCredentials;
		retry;
		constructor(config) {
			this.options = {
				backend: config.options?.backend,
				agent: config.agent,
				responseEncoding: config.responseEncoding ?? "base64",
				cache: config.cache,
				signal: config.signal,
				keepAlive: config.keepAlive ?? true
			};
			this.upstashSyncToken = "";
			this.readYourWrites = config.readYourWrites ?? true;
			this.baseUrl = (config.baseUrl || "").replace(/\/$/, "");
			if (this.baseUrl && !/^https?:\/\/[^\s#$./?].\S*$/.test(this.baseUrl)) throw new UrlError(this.baseUrl);
			this.headers = {
				"Content-Type": "application/json",
				...config.headers
			};
			this.hasCredentials = Boolean(this.baseUrl && this.headers.authorization.split(" ")[1]);
			if (this.options.responseEncoding === "base64") this.headers["Upstash-Encoding"] = "base64";
			this.retry = typeof config.retry === "boolean" && !config.retry ? {
				attempts: 1,
				backoff: () => 0
			} : {
				attempts: config.retry?.retries ?? 5,
				backoff: config.retry?.backoff ?? ((retryCount) => Math.exp(retryCount) * 50)
			};
		}
		mergeTelemetry(telemetry) {
			this.headers = merge(this.headers, "Upstash-Telemetry-Runtime", telemetry.runtime);
			this.headers = merge(this.headers, "Upstash-Telemetry-Platform", telemetry.platform);
			this.headers = merge(this.headers, "Upstash-Telemetry-Sdk", telemetry.sdk);
		}
		async request(req) {
			if (this.readYourWrites) this.headers["upstash-sync-token"] = this.upstashSyncToken;
			const requestHeaders = mergeHeaders(this.headers, req.headers ?? {});
			const requestUrl = [this.baseUrl, ...req.path ?? []].join("/");
			const isEventStream = requestHeaders.Accept === "text/event-stream";
			const signal = req.signal ?? this.options.signal;
			const isSignalFunction = typeof signal === "function";
			const requestOptions = {
				cache: this.options.cache,
				method: "POST",
				headers: requestHeaders,
				body: JSON.stringify(req.body),
				keepalive: this.options.keepAlive,
				agent: this.options.agent,
				signal: isSignalFunction ? signal() : signal,
				/**
				* Fastly specific
				*/
				backend: this.options.backend
			};
			if (!this.hasCredentials) console.warn("[Upstash Redis] Redis client was initialized without url or token. Failed to execute command.");
			let res = null;
			let error = null;
			for (let i = 0; i <= this.retry.attempts; i++) {
				if (i > 0 && requestHeaders["Upstash-Telemetry-Sdk"]) requestHeaders["Upstash-Telemetry-Retry"] = String(i);
				try {
					res = await fetch(requestUrl, requestOptions);
					break;
				} catch (error_) {
					if (requestOptions.signal?.aborted && isSignalFunction) throw error_;
					else if (requestOptions.signal?.aborted) {
						const myBlob = new Blob([JSON.stringify({ result: requestOptions.signal.reason ?? "Aborted" })]);
						const myOptions = {
							status: 200,
							statusText: requestOptions.signal.reason ?? "Aborted"
						};
						res = new Response(myBlob, myOptions);
						break;
					}
					error = error_;
					if (i < this.retry.attempts) await new Promise((r) => setTimeout(r, this.retry.backoff(i)));
				}
			}
			if (!res) throw error ?? /* @__PURE__ */ new Error("Exhausted all retries");
			if (!res.ok) {
				let body2;
				const rawBody2 = await res.text();
				try {
					body2 = JSON.parse(rawBody2);
				} catch (error2) {
					throw new UpstashJSONParseError(rawBody2, { cause: error2 });
				}
				throw new UpstashError(`${body2.error}, command was: ${JSON.stringify(req.body)}`);
			}
			if (this.readYourWrites) {
				const headers = res.headers;
				this.upstashSyncToken = headers.get("upstash-sync-token") ?? "";
			}
			if (isEventStream && req && req.onMessage && res.body) {
				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				(async () => {
					try {
						let buffer = "";
						while (true) {
							const { value, done } = await reader.read();
							if (done) break;
							buffer += decoder.decode(value, { stream: true });
							const lines = buffer.split("\n");
							buffer = lines.pop() || "";
							if (buffer.length > MAX_BUFFER_SIZE) throw new Error("Buffer size exceeded (1MB)");
							for (const line of lines) if (line.startsWith("data: ")) {
								const data = line.slice(6);
								req.onMessage?.(data);
							}
						}
					} catch (error2) {
						if (error2 instanceof Error && error2.name === "AbortError") {} else console.error("Stream reading error:", error2);
					} finally {
						try {
							await reader.cancel();
						} catch {}
					}
				})();
				return { result: 1 };
			}
			let body;
			const rawBody = await res.text();
			try {
				body = JSON.parse(rawBody);
			} catch (error2) {
				throw new UpstashJSONParseError(rawBody, { cause: error2 });
			}
			if (this.readYourWrites) {
				const headers = res.headers;
				this.upstashSyncToken = headers.get("upstash-sync-token") ?? "";
			}
			if (this.options.responseEncoding === "base64") {
				if (Array.isArray(body)) return body.map(({ result: result2, error: error2 }) => ({
					result: decode(result2),
					error: error2
				}));
				return {
					result: decode(body.result),
					error: body.error
				};
			}
			return body;
		}
	};
	defaultSerializer = (c) => {
		switch (typeof c) {
			case "string":
			case "number":
			case "boolean": return c;
			default: return JSON.stringify(c);
		}
	};
	Command = class {
		command;
		serialize;
		deserialize;
		headers;
		path;
		onMessage;
		isStreaming;
		signal;
		/**
		* Create a new command instance.
		*
		* You can define a custom `deserialize` function. By default we try to deserialize as json.
		*/
		constructor(command, opts) {
			this.serialize = defaultSerializer;
			this.deserialize = opts?.automaticDeserialization === void 0 || opts.automaticDeserialization ? opts?.deserialize ?? parseResponse : (x) => x;
			this.command = command.map((c) => this.serialize(c));
			this.headers = opts?.headers;
			this.path = opts?.path;
			this.onMessage = opts?.streamOptions?.onMessage;
			this.isStreaming = opts?.streamOptions?.isStreaming ?? false;
			this.signal = opts?.streamOptions?.signal;
			if (opts?.latencyLogging) {
				const originalExec = this.exec.bind(this);
				this.exec = async (client) => {
					const start = performance.now();
					const result = await originalExec(client);
					const loggerResult = (performance.now() - start).toFixed(2);
					console.log(`Latency for \x1B[38;2;19;185;39m${this.command[0].toString().toUpperCase()}\x1B[0m: \x1B[38;2;0;255;255m${loggerResult} ms\x1B[0m`);
					return result;
				};
			}
		}
		/**
		* Execute the command using a client.
		*/
		async exec(client) {
			const { result, error } = await client.request({
				body: this.command,
				path: this.path,
				upstashSyncToken: client.upstashSyncToken,
				headers: this.headers,
				onMessage: this.onMessage,
				isStreaming: this.isStreaming,
				signal: this.signal
			});
			if (error) throw new UpstashError(error);
			if (result === void 0) throw new TypeError("Request did not return a result");
			return this.deserialize(result);
		}
	};
	ExecCommand = class extends Command {
		constructor(cmd, opts) {
			const normalizedCmd = cmd.map((arg) => typeof arg === "string" ? arg : String(arg));
			super(normalizedCmd, opts);
		}
	};
	FIELD_TYPES = [
		"TEXT",
		"U64",
		"I64",
		"F64",
		"BOOL",
		"DATE",
		"KEYWORD",
		"FACET"
	];
	SearchIndex = class {
		name;
		schema;
		client;
		constructor({ name, schema, client }) {
			this.name = name;
			this.schema = schema;
			this.client = client;
		}
		async waitIndexing() {
			return await new ExecCommand(["SEARCH.WAITINDEXING", this.name]).exec(this.client);
		}
		async describe() {
			const rawResult = await new ExecCommand(["SEARCH.DESCRIBE", this.name]).exec(this.client);
			if (!rawResult) return null;
			return deserializeDescribeResponse(rawResult);
		}
		async query(options) {
			const rawResult = await new ExecCommand(buildQueryCommand("SEARCH.QUERY", this.name, options)).exec(this.client);
			if (!rawResult) return rawResult;
			return deserializeQueryResponse(rawResult);
		}
		async aggregate(options) {
			return deserializeAggregateResponse(await new ExecCommand(buildAggregateCommand(this.name, options)).exec(this.client));
		}
		async count({ filter }) {
			return { count: parseCountResponse(await new ExecCommand(buildQueryCommand("SEARCH.COUNT", this.name, { filter })).exec(this.client)) };
		}
		async drop() {
			return await new ExecCommand(["SEARCH.DROP", this.name]).exec(this.client);
		}
		async addAlias({ alias }) {
			return await new ExecCommand([
				"SEARCH.ALIASADD",
				alias,
				this.name
			]).exec(this.client);
		}
	};
	HRandFieldCommand = class extends Command {
		constructor(cmd, opts) {
			const command = ["hrandfield", cmd[0]];
			if (typeof cmd[1] === "number") command.push(cmd[1]);
			if (cmd[2]) command.push("WITHVALUES");
			super(command, {
				deserialize: cmd[2] ? (result) => deserialize(result) : opts?.deserialize,
				...opts
			});
		}
	};
	AppendCommand = class extends Command {
		constructor(cmd, opts) {
			super(["append", ...cmd], opts);
		}
	};
	BitCountCommand = class extends Command {
		constructor([key, start, end], opts) {
			const command = ["bitcount", key];
			if (typeof start === "number") command.push(start);
			if (typeof end === "number") command.push(end);
			super(command, opts);
		}
	};
	BitFieldCommand = class {
		constructor(args, client, opts, execOperation = (command) => command.exec(this.client)) {
			this.client = client;
			this.opts = opts;
			this.execOperation = execOperation;
			this.command = ["bitfield", ...args];
		}
		command;
		chain(...args) {
			this.command.push(...args);
			return this;
		}
		get(...args) {
			return this.chain("get", ...args);
		}
		set(...args) {
			return this.chain("set", ...args);
		}
		incrby(...args) {
			return this.chain("incrby", ...args);
		}
		overflow(overflow) {
			return this.chain("overflow", overflow);
		}
		exec() {
			const command = new Command(this.command, this.opts);
			return this.execOperation(command);
		}
	};
	BitOpCommand = class extends Command {
		constructor(cmd, opts) {
			super(["bitop", ...cmd], opts);
		}
	};
	BitPosCommand = class extends Command {
		constructor(cmd, opts) {
			super(["bitpos", ...cmd], opts);
		}
	};
	ClientSetInfoCommand = class extends Command {
		constructor([attribute, value], opts) {
			super([
				"CLIENT",
				"SETINFO",
				attribute.toUpperCase(),
				value
			], opts);
		}
	};
	CopyCommand = class extends Command {
		constructor([key, destinationKey, opts], commandOptions) {
			super([
				"COPY",
				key,
				destinationKey,
				...opts?.replace ? ["REPLACE"] : []
			], {
				...commandOptions,
				deserialize(result) {
					if (result > 0) return "COPIED";
					return "NOT_COPIED";
				}
			});
		}
	};
	DBSizeCommand = class extends Command {
		constructor(opts) {
			super(["dbsize"], opts);
		}
	};
	DecrCommand = class extends Command {
		constructor(cmd, opts) {
			super(["decr", ...cmd], opts);
		}
	};
	DecrByCommand = class extends Command {
		constructor(cmd, opts) {
			super(["decrby", ...cmd], opts);
		}
	};
	DelCommand = class extends Command {
		constructor(cmd, opts) {
			super(["del", ...cmd], opts);
		}
	};
	EchoCommand = class extends Command {
		constructor(cmd, opts) {
			super(["echo", ...cmd], opts);
		}
	};
	EvalROCommand = class extends Command {
		constructor([script, keys, args], opts) {
			super([
				"eval_ro",
				script,
				keys.length,
				...keys,
				...args ?? []
			], opts);
		}
	};
	EvalCommand = class extends Command {
		constructor([script, keys, args], opts) {
			super([
				"eval",
				script,
				keys.length,
				...keys,
				...args ?? []
			], opts);
		}
	};
	EvalshaROCommand = class extends Command {
		constructor([sha, keys, args], opts) {
			super([
				"evalsha_ro",
				sha,
				keys.length,
				...keys,
				...args ?? []
			], opts);
		}
	};
	EvalshaCommand = class extends Command {
		constructor([sha, keys, args], opts) {
			super([
				"evalsha",
				sha,
				keys.length,
				...keys,
				...args ?? []
			], opts);
		}
	};
	ExistsCommand = class extends Command {
		constructor(cmd, opts) {
			super(["exists", ...cmd], opts);
		}
	};
	ExpireCommand = class extends Command {
		constructor(cmd, opts) {
			super(["expire", ...cmd.filter(Boolean)], opts);
		}
	};
	ExpireAtCommand = class extends Command {
		constructor(cmd, opts) {
			super(["expireat", ...cmd], opts);
		}
	};
	FCallCommand = class extends Command {
		constructor([functionName, keys, args], opts) {
			super([
				"fcall",
				functionName,
				...keys ? [keys.length, ...keys] : [0],
				...args ?? []
			], opts);
		}
	};
	FCallRoCommand = class extends Command {
		constructor([functionName, keys, args], opts) {
			super([
				"fcall_ro",
				functionName,
				...keys ? [keys.length, ...keys] : [0],
				...args ?? []
			], opts);
		}
	};
	FlushAllCommand = class extends Command {
		constructor(args, opts) {
			const command = ["flushall"];
			if (args && args.length > 0 && args[0].async) command.push("async");
			super(command, opts);
		}
	};
	FlushDBCommand = class extends Command {
		constructor([opts], cmdOpts) {
			const command = ["flushdb"];
			if (opts?.async) command.push("async");
			super(command, cmdOpts);
		}
	};
	FunctionDeleteCommand = class extends Command {
		constructor([libraryName], opts) {
			super([
				"function",
				"delete",
				libraryName
			], opts);
		}
	};
	FunctionFlushCommand = class extends Command {
		constructor(opts) {
			super(["function", "flush"], opts);
		}
	};
	FunctionListCommand = class extends Command {
		constructor([args], opts) {
			const command = ["function", "list"];
			if (args?.libraryName) command.push("libraryname", args.libraryName);
			if (args?.withCode) command.push("withcode");
			super(command, {
				deserialize: deserialize2,
				...opts
			});
		}
	};
	FunctionLoadCommand = class extends Command {
		constructor([args], opts) {
			super([
				"function",
				"load",
				...args.replace ? ["replace"] : [],
				args.code
			], opts);
		}
	};
	FunctionStatsCommand = class extends Command {
		constructor(opts) {
			super(["function", "stats"], {
				deserialize: deserialize3,
				...opts
			});
		}
	};
	GeoAddCommand = class extends Command {
		constructor([key, arg1, ...arg2], opts) {
			const command = ["geoadd", key];
			if ("nx" in arg1 && arg1.nx) command.push("nx");
			else if ("xx" in arg1 && arg1.xx) command.push("xx");
			if ("ch" in arg1 && arg1.ch) command.push("ch");
			if ("latitude" in arg1 && arg1.latitude) command.push(arg1.longitude, arg1.latitude, arg1.member);
			command.push(...arg2.flatMap(({ latitude, longitude, member }) => [
				longitude,
				latitude,
				member
			]));
			super(command, opts);
		}
	};
	GeoDistCommand = class extends Command {
		constructor([key, member1, member2, unit = "M"], opts) {
			super([
				"GEODIST",
				key,
				member1,
				member2,
				unit
			], opts);
		}
	};
	GeoHashCommand = class extends Command {
		constructor(cmd, opts) {
			const [key] = cmd;
			const members = Array.isArray(cmd[1]) ? cmd[1] : cmd.slice(1);
			super([
				"GEOHASH",
				key,
				...members
			], opts);
		}
	};
	GeoPosCommand = class extends Command {
		constructor(cmd, opts) {
			const [key] = cmd;
			const members = Array.isArray(cmd[1]) ? cmd[1] : cmd.slice(1);
			super([
				"GEOPOS",
				key,
				...members
			], {
				deserialize: (result) => transform(result),
				...opts
			});
		}
	};
	GeoSearchCommand = class extends Command {
		constructor([key, centerPoint, shape, order, opts], commandOptions) {
			const command = ["GEOSEARCH", key];
			if (centerPoint.type === "FROMMEMBER" || centerPoint.type === "frommember") command.push(centerPoint.type, centerPoint.member);
			if (centerPoint.type === "FROMLONLAT" || centerPoint.type === "fromlonlat") command.push(centerPoint.type, centerPoint.coordinate.lon, centerPoint.coordinate.lat);
			if (shape.type === "BYRADIUS" || shape.type === "byradius") command.push(shape.type, shape.radius, shape.radiusType);
			if (shape.type === "BYBOX" || shape.type === "bybox") command.push(shape.type, shape.rect.width, shape.rect.height, shape.rectType);
			command.push(order);
			if (opts?.count) command.push("COUNT", opts.count.limit, ...opts.count.any ? ["ANY"] : []);
			const transform2 = (result) => {
				if (!opts?.withCoord && !opts?.withDist && !opts?.withHash) return result.map((member) => {
					try {
						return { member: JSON.parse(member) };
					} catch {
						return { member };
					}
				});
				return result.map((members) => {
					let counter = 1;
					const obj = {};
					try {
						obj.member = JSON.parse(members[0]);
					} catch {
						obj.member = members[0];
					}
					if (opts.withDist) obj.dist = Number.parseFloat(members[counter++]);
					if (opts.withHash) obj.hash = members[counter++].toString();
					if (opts.withCoord) obj.coord = {
						long: Number.parseFloat(members[counter][0]),
						lat: Number.parseFloat(members[counter][1])
					};
					return obj;
				});
			};
			super([
				...command,
				...opts?.withCoord ? ["WITHCOORD"] : [],
				...opts?.withDist ? ["WITHDIST"] : [],
				...opts?.withHash ? ["WITHHASH"] : []
			], {
				deserialize: transform2,
				...commandOptions
			});
		}
	};
	GeoSearchStoreCommand = class extends Command {
		constructor([destination, key, centerPoint, shape, order, opts], commandOptions) {
			const command = [
				"GEOSEARCHSTORE",
				destination,
				key
			];
			if (centerPoint.type === "FROMMEMBER" || centerPoint.type === "frommember") command.push(centerPoint.type, centerPoint.member);
			if (centerPoint.type === "FROMLONLAT" || centerPoint.type === "fromlonlat") command.push(centerPoint.type, centerPoint.coordinate.lon, centerPoint.coordinate.lat);
			if (shape.type === "BYRADIUS" || shape.type === "byradius") command.push(shape.type, shape.radius, shape.radiusType);
			if (shape.type === "BYBOX" || shape.type === "bybox") command.push(shape.type, shape.rect.width, shape.rect.height, shape.rectType);
			command.push(order);
			if (opts?.count) command.push("COUNT", opts.count.limit, ...opts.count.any ? ["ANY"] : []);
			super([...command, ...opts?.storeDist ? ["STOREDIST"] : []], commandOptions);
		}
	};
	GetCommand = class extends Command {
		constructor(cmd, opts) {
			super(["get", ...cmd], opts);
		}
	};
	GetBitCommand = class extends Command {
		constructor(cmd, opts) {
			super(["getbit", ...cmd], opts);
		}
	};
	GetDelCommand = class extends Command {
		constructor(cmd, opts) {
			super(["getdel", ...cmd], opts);
		}
	};
	GetExCommand = class extends Command {
		constructor([key, opts], cmdOpts) {
			const command = ["getex", key];
			if (opts) {
				if ("ex" in opts && typeof opts.ex === "number") command.push("ex", opts.ex);
				else if ("px" in opts && typeof opts.px === "number") command.push("px", opts.px);
				else if ("exat" in opts && typeof opts.exat === "number") command.push("exat", opts.exat);
				else if ("pxat" in opts && typeof opts.pxat === "number") command.push("pxat", opts.pxat);
				else if ("persist" in opts && opts.persist) command.push("persist");
			}
			super(command, cmdOpts);
		}
	};
	GetRangeCommand = class extends Command {
		constructor(cmd, opts) {
			super(["getrange", ...cmd], opts);
		}
	};
	GetSetCommand = class extends Command {
		constructor(cmd, opts) {
			super(["getset", ...cmd], opts);
		}
	};
	HDelCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hdel", ...cmd], opts);
		}
	};
	HExistsCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hexists", ...cmd], opts);
		}
	};
	HExpireCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields, seconds, option] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"hexpire",
				key,
				seconds,
				...option ? [option] : [],
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HExpireAtCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields, timestamp, option] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"hexpireat",
				key,
				timestamp,
				...option ? [option] : [],
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HExpireTimeCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"hexpiretime",
				key,
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HPersistCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"hpersist",
				key,
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HPExpireCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields, milliseconds, option] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"hpexpire",
				key,
				milliseconds,
				...option ? [option] : [],
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HPExpireAtCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields, timestamp, option] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"hpexpireat",
				key,
				timestamp,
				...option ? [option] : [],
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HPExpireTimeCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"hpexpiretime",
				key,
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HPTtlCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"hpttl",
				key,
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HGetCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hget", ...cmd], opts);
		}
	};
	HGetAllCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hgetall", ...cmd], {
				deserialize: (result) => deserialize4(result),
				...opts
			});
		}
	};
	HMGetCommand = class extends Command {
		constructor([key, ...fields], opts) {
			super([
				"hmget",
				key,
				...fields
			], {
				deserialize: (result) => deserialize5(fields, result),
				...opts
			});
		}
	};
	HGetDelCommand = class extends Command {
		constructor([key, ...fields], opts) {
			super([
				"hgetdel",
				key,
				"FIELDS",
				fields.length,
				...fields
			], {
				deserialize: (result) => deserialize5(fields.map(String), result),
				...opts
			});
		}
	};
	HGetExCommand = class extends Command {
		constructor([key, opts, ...fields], cmdOpts) {
			const command = ["hgetex", key];
			if ("ex" in opts && typeof opts.ex === "number") command.push("EX", opts.ex);
			else if ("px" in opts && typeof opts.px === "number") command.push("PX", opts.px);
			else if ("exat" in opts && typeof opts.exat === "number") command.push("EXAT", opts.exat);
			else if ("pxat" in opts && typeof opts.pxat === "number") command.push("PXAT", opts.pxat);
			else if ("persist" in opts && opts.persist) command.push("PERSIST");
			command.push("FIELDS", fields.length, ...fields);
			super(command, {
				deserialize: (result) => deserialize5(fields.map(String), result),
				...cmdOpts
			});
		}
	};
	HIncrByCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hincrby", ...cmd], opts);
		}
	};
	HIncrByFloatCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hincrbyfloat", ...cmd], opts);
		}
	};
	HKeysCommand = class extends Command {
		constructor([key], opts) {
			super(["hkeys", key], opts);
		}
	};
	HLenCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hlen", ...cmd], opts);
		}
	};
	HMSetCommand = class extends Command {
		constructor([key, kv], opts) {
			super([
				"hmset",
				key,
				...Object.entries(kv).flatMap(([field, value]) => [field, value])
			], opts);
		}
	};
	HScanCommand = class extends Command {
		constructor([key, cursor, cmdOpts], opts) {
			const command = [
				"hscan",
				key,
				cursor
			];
			if (cmdOpts?.match) command.push("match", cmdOpts.match);
			if (typeof cmdOpts?.count === "number") command.push("count", cmdOpts.count);
			super(command, {
				deserialize: deserializeScanResponse,
				...opts
			});
		}
	};
	HSetCommand = class extends Command {
		constructor([key, kv], opts) {
			super([
				"hset",
				key,
				...Object.entries(kv).flatMap(([field, value]) => [field, value])
			], opts);
		}
	};
	HSetExCommand = class extends Command {
		constructor([key, opts, kv], cmdOpts) {
			const command = ["hsetex", key];
			if (opts.conditional) command.push(opts.conditional.toUpperCase());
			if (opts.expiration) {
				if ("ex" in opts.expiration && typeof opts.expiration.ex === "number") command.push("EX", opts.expiration.ex);
				else if ("px" in opts.expiration && typeof opts.expiration.px === "number") command.push("PX", opts.expiration.px);
				else if ("exat" in opts.expiration && typeof opts.expiration.exat === "number") command.push("EXAT", opts.expiration.exat);
				else if ("pxat" in opts.expiration && typeof opts.expiration.pxat === "number") command.push("PXAT", opts.expiration.pxat);
				else if ("keepttl" in opts.expiration && opts.expiration.keepttl) command.push("KEEPTTL");
			}
			const entries = Object.entries(kv);
			command.push("FIELDS", entries.length);
			for (const [field, value] of entries) command.push(field, value);
			super(command, cmdOpts);
		}
	};
	HSetNXCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hsetnx", ...cmd], opts);
		}
	};
	HStrLenCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hstrlen", ...cmd], opts);
		}
	};
	HTtlCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, fields] = cmd;
			const fieldArray = Array.isArray(fields) ? fields : [fields];
			super([
				"httl",
				key,
				"FIELDS",
				fieldArray.length,
				...fieldArray
			], opts);
		}
	};
	HValsCommand = class extends Command {
		constructor(cmd, opts) {
			super(["hvals", ...cmd], opts);
		}
	};
	IncrCommand = class extends Command {
		constructor(cmd, opts) {
			super(["incr", ...cmd], opts);
		}
	};
	IncrByCommand = class extends Command {
		constructor(cmd, opts) {
			super(["incrby", ...cmd], opts);
		}
	};
	IncrByFloatCommand = class extends Command {
		constructor(cmd, opts) {
			super(["incrbyfloat", ...cmd], opts);
		}
	};
	JsonArrAppendCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.ARRAPPEND", ...cmd], opts);
		}
	};
	JsonArrIndexCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.ARRINDEX", ...cmd], opts);
		}
	};
	JsonArrInsertCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.ARRINSERT", ...cmd], opts);
		}
	};
	JsonArrLenCommand = class extends Command {
		constructor(cmd, opts) {
			super([
				"JSON.ARRLEN",
				cmd[0],
				cmd[1] ?? "$"
			], opts);
		}
	};
	JsonArrPopCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.ARRPOP", ...cmd], opts);
		}
	};
	JsonArrTrimCommand = class extends Command {
		constructor(cmd, opts) {
			const path = cmd[1] ?? "$";
			const start = cmd[2] ?? 0;
			const stop = cmd[3] ?? 0;
			super([
				"JSON.ARRTRIM",
				cmd[0],
				path,
				start,
				stop
			], opts);
		}
	};
	JsonClearCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.CLEAR", ...cmd], opts);
		}
	};
	JsonDelCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.DEL", ...cmd], opts);
		}
	};
	JsonForgetCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.FORGET", ...cmd], opts);
		}
	};
	JsonGetCommand = class extends Command {
		constructor(cmd, opts) {
			const command = ["JSON.GET"];
			if (typeof cmd[1] === "string") command.push(...cmd);
			else {
				command.push(cmd[0]);
				if (cmd[1]) {
					if (cmd[1].indent) command.push("INDENT", cmd[1].indent);
					if (cmd[1].newline) command.push("NEWLINE", cmd[1].newline);
					if (cmd[1].space) command.push("SPACE", cmd[1].space);
				}
				command.push(...cmd.slice(2));
			}
			super(command, opts);
		}
	};
	JsonMergeCommand = class extends Command {
		constructor(cmd, opts) {
			const command = ["JSON.MERGE", ...cmd];
			super(command, opts);
		}
	};
	JsonMGetCommand = class extends Command {
		constructor(cmd, opts) {
			super([
				"JSON.MGET",
				...cmd[0],
				cmd[1]
			], opts);
		}
	};
	JsonMSetCommand = class extends Command {
		constructor(cmd, opts) {
			const command = ["JSON.MSET"];
			for (const c of cmd) command.push(c.key, c.path, c.value);
			super(command, opts);
		}
	};
	JsonNumIncrByCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.NUMINCRBY", ...cmd], opts);
		}
	};
	JsonNumMultByCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.NUMMULTBY", ...cmd], opts);
		}
	};
	JsonObjKeysCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.OBJKEYS", ...cmd], opts);
		}
	};
	JsonObjLenCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.OBJLEN", ...cmd], opts);
		}
	};
	JsonRespCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.RESP", ...cmd], opts);
		}
	};
	JsonSetCommand = class extends Command {
		constructor(cmd, opts) {
			const command = [
				"JSON.SET",
				cmd[0],
				cmd[1],
				cmd[2]
			];
			if (cmd[3]) {
				if (cmd[3].nx) command.push("NX");
				else if (cmd[3].xx) command.push("XX");
			}
			super(command, opts);
		}
	};
	JsonStrAppendCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.STRAPPEND", ...cmd], opts);
		}
	};
	JsonStrLenCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.STRLEN", ...cmd], opts);
		}
	};
	JsonToggleCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.TOGGLE", ...cmd], opts);
		}
	};
	JsonTypeCommand = class extends Command {
		constructor(cmd, opts) {
			super(["JSON.TYPE", ...cmd], opts);
		}
	};
	KeysCommand = class extends Command {
		constructor(cmd, opts) {
			super(["keys", ...cmd], opts);
		}
	};
	LIndexCommand = class extends Command {
		constructor(cmd, opts) {
			super(["lindex", ...cmd], opts);
		}
	};
	LInsertCommand = class extends Command {
		constructor(cmd, opts) {
			super(["linsert", ...cmd], opts);
		}
	};
	LLenCommand = class extends Command {
		constructor(cmd, opts) {
			super(["llen", ...cmd], opts);
		}
	};
	LMoveCommand = class extends Command {
		constructor(cmd, opts) {
			super(["lmove", ...cmd], opts);
		}
	};
	LmPopCommand = class extends Command {
		constructor(cmd, opts) {
			const [numkeys, keys, direction, count] = cmd;
			super([
				"LMPOP",
				numkeys,
				...keys,
				direction,
				...count ? ["COUNT", count] : []
			], opts);
		}
	};
	LPopCommand = class extends Command {
		constructor(cmd, opts) {
			super(["lpop", ...cmd], opts);
		}
	};
	LPosCommand = class extends Command {
		constructor(cmd, opts) {
			const args = [
				"lpos",
				cmd[0],
				cmd[1]
			];
			if (typeof cmd[2]?.rank === "number") args.push("rank", cmd[2].rank);
			if (typeof cmd[2]?.count === "number") args.push("count", cmd[2].count);
			if (typeof cmd[2]?.maxLen === "number") args.push("maxLen", cmd[2].maxLen);
			super(args, opts);
		}
	};
	LPushCommand = class extends Command {
		constructor(cmd, opts) {
			super(["lpush", ...cmd], opts);
		}
	};
	LPushXCommand = class extends Command {
		constructor(cmd, opts) {
			super(["lpushx", ...cmd], opts);
		}
	};
	LRangeCommand = class extends Command {
		constructor(cmd, opts) {
			super(["lrange", ...cmd], opts);
		}
	};
	LRemCommand = class extends Command {
		constructor(cmd, opts) {
			super(["lrem", ...cmd], opts);
		}
	};
	LSetCommand = class extends Command {
		constructor(cmd, opts) {
			super(["lset", ...cmd], opts);
		}
	};
	LTrimCommand = class extends Command {
		constructor(cmd, opts) {
			super(["ltrim", ...cmd], opts);
		}
	};
	MGetCommand = class extends Command {
		constructor(cmd, opts) {
			const keys = Array.isArray(cmd[0]) ? cmd[0] : cmd;
			super(["mget", ...keys], opts);
		}
	};
	MSetCommand = class extends Command {
		constructor([kv], opts) {
			super(["mset", ...Object.entries(kv).flatMap(([key, value]) => [key, value])], opts);
		}
	};
	MSetNXCommand = class extends Command {
		constructor([kv], opts) {
			super(["msetnx", ...Object.entries(kv).flat()], opts);
		}
	};
	PersistCommand = class extends Command {
		constructor(cmd, opts) {
			super(["persist", ...cmd], opts);
		}
	};
	PExpireCommand = class extends Command {
		constructor(cmd, opts) {
			super(["pexpire", ...cmd], opts);
		}
	};
	PExpireAtCommand = class extends Command {
		constructor(cmd, opts) {
			super(["pexpireat", ...cmd], opts);
		}
	};
	PfAddCommand = class extends Command {
		constructor(cmd, opts) {
			super(["pfadd", ...cmd], opts);
		}
	};
	PfCountCommand = class extends Command {
		constructor(cmd, opts) {
			super(["pfcount", ...cmd], opts);
		}
	};
	PfMergeCommand = class extends Command {
		constructor(cmd, opts) {
			super(["pfmerge", ...cmd], opts);
		}
	};
	PingCommand = class extends Command {
		constructor(cmd, opts) {
			const command = ["ping"];
			if (cmd?.[0] !== void 0) command.push(cmd[0]);
			super(command, opts);
		}
	};
	PSetEXCommand = class extends Command {
		constructor(cmd, opts) {
			super(["psetex", ...cmd], opts);
		}
	};
	PTtlCommand = class extends Command {
		constructor(cmd, opts) {
			super(["pttl", ...cmd], opts);
		}
	};
	PublishCommand = class extends Command {
		constructor(cmd, opts) {
			super(["publish", ...cmd], opts);
		}
	};
	RandomKeyCommand = class extends Command {
		constructor(opts) {
			super(["randomkey"], opts);
		}
	};
	RenameCommand = class extends Command {
		constructor(cmd, opts) {
			super(["rename", ...cmd], opts);
		}
	};
	RenameNXCommand = class extends Command {
		constructor(cmd, opts) {
			super(["renamenx", ...cmd], opts);
		}
	};
	RPopCommand = class extends Command {
		constructor(cmd, opts) {
			super(["rpop", ...cmd], opts);
		}
	};
	RPushCommand = class extends Command {
		constructor(cmd, opts) {
			super(["rpush", ...cmd], opts);
		}
	};
	RPushXCommand = class extends Command {
		constructor(cmd, opts) {
			super(["rpushx", ...cmd], opts);
		}
	};
	SAddCommand = class extends Command {
		constructor(cmd, opts) {
			super(["sadd", ...cmd], opts);
		}
	};
	ScanCommand = class extends Command {
		constructor([cursor, opts], cmdOpts) {
			const command = ["scan", cursor];
			if (opts?.match) command.push("match", opts.match);
			if (typeof opts?.count === "number") command.push("count", opts.count);
			if (opts && "withType" in opts && opts.withType === true) command.push("withtype");
			else if (opts && "type" in opts && opts.type && opts.type.length > 0) command.push("type", opts.type);
			super(command, {
				deserialize: opts?.withType ? deserializeScanWithTypesResponse : deserializeScanResponse,
				...cmdOpts
			});
		}
	};
	SCardCommand = class extends Command {
		constructor(cmd, opts) {
			super(["scard", ...cmd], opts);
		}
	};
	ScriptExistsCommand = class extends Command {
		constructor(hashes, opts) {
			super([
				"script",
				"exists",
				...hashes
			], {
				deserialize: (result) => result,
				...opts
			});
		}
	};
	ScriptFlushCommand = class extends Command {
		constructor([opts], cmdOpts) {
			const cmd = ["script", "flush"];
			if (opts?.sync) cmd.push("sync");
			else if (opts?.async) cmd.push("async");
			super(cmd, cmdOpts);
		}
	};
	ScriptLoadCommand = class extends Command {
		constructor(args, opts) {
			super([
				"script",
				"load",
				...args
			], opts);
		}
	};
	SDiffCommand = class extends Command {
		constructor(cmd, opts) {
			super(["sdiff", ...cmd], opts);
		}
	};
	SDiffStoreCommand = class extends Command {
		constructor(cmd, opts) {
			super(["sdiffstore", ...cmd], opts);
		}
	};
	SetCommand = class extends Command {
		constructor([key, value, opts], cmdOpts) {
			const command = [
				"set",
				key,
				value
			];
			if (opts) {
				if ("nx" in opts && opts.nx) command.push("nx");
				else if ("xx" in opts && opts.xx) command.push("xx");
				if ("get" in opts && opts.get) command.push("get");
				if ("ex" in opts && typeof opts.ex === "number") command.push("ex", opts.ex);
				else if ("px" in opts && typeof opts.px === "number") command.push("px", opts.px);
				else if ("exat" in opts && typeof opts.exat === "number") command.push("exat", opts.exat);
				else if ("pxat" in opts && typeof opts.pxat === "number") command.push("pxat", opts.pxat);
				else if ("keepTtl" in opts && opts.keepTtl) command.push("keepTtl");
			}
			super(command, cmdOpts);
		}
	};
	SetBitCommand = class extends Command {
		constructor(cmd, opts) {
			super(["setbit", ...cmd], opts);
		}
	};
	SetExCommand = class extends Command {
		constructor(cmd, opts) {
			super(["setex", ...cmd], opts);
		}
	};
	SetNxCommand = class extends Command {
		constructor(cmd, opts) {
			super(["setnx", ...cmd], opts);
		}
	};
	SetRangeCommand = class extends Command {
		constructor(cmd, opts) {
			super(["setrange", ...cmd], opts);
		}
	};
	SInterCommand = class extends Command {
		constructor(cmd, opts) {
			super(["sinter", ...cmd], opts);
		}
	};
	SInterCardCommand = class extends Command {
		constructor(cmd, cmdOpts) {
			const [keys, opts] = cmd;
			const command = [
				"sintercard",
				keys.length,
				...keys
			];
			if (opts?.limit !== void 0) command.push("LIMIT", opts.limit);
			super(command, cmdOpts);
		}
	};
	SInterStoreCommand = class extends Command {
		constructor(cmd, opts) {
			super(["sinterstore", ...cmd], opts);
		}
	};
	SIsMemberCommand = class extends Command {
		constructor(cmd, opts) {
			super(["sismember", ...cmd], opts);
		}
	};
	SMembersCommand = class extends Command {
		constructor(cmd, opts) {
			super(["smembers", ...cmd], opts);
		}
	};
	SMIsMemberCommand = class extends Command {
		constructor(cmd, opts) {
			super([
				"smismember",
				cmd[0],
				...cmd[1]
			], opts);
		}
	};
	SMoveCommand = class extends Command {
		constructor(cmd, opts) {
			super(["smove", ...cmd], opts);
		}
	};
	SPopCommand = class extends Command {
		constructor([key, count], opts) {
			const command = ["spop", key];
			if (typeof count === "number") command.push(count);
			super(command, opts);
		}
	};
	SRandMemberCommand = class extends Command {
		constructor([key, count], opts) {
			const command = ["srandmember", key];
			if (typeof count === "number") command.push(count);
			super(command, opts);
		}
	};
	SRemCommand = class extends Command {
		constructor(cmd, opts) {
			super(["srem", ...cmd], opts);
		}
	};
	SScanCommand = class extends Command {
		constructor([key, cursor, opts], cmdOpts) {
			const command = [
				"sscan",
				key,
				cursor
			];
			if (opts?.match) command.push("match", opts.match);
			if (typeof opts?.count === "number") command.push("count", opts.count);
			super(command, {
				deserialize: deserializeScanResponse,
				...cmdOpts
			});
		}
	};
	StrLenCommand = class extends Command {
		constructor(cmd, opts) {
			super(["strlen", ...cmd], opts);
		}
	};
	SUnionCommand = class extends Command {
		constructor(cmd, opts) {
			super(["sunion", ...cmd], opts);
		}
	};
	SUnionStoreCommand = class extends Command {
		constructor(cmd, opts) {
			super(["sunionstore", ...cmd], opts);
		}
	};
	TimeCommand = class extends Command {
		constructor(opts) {
			super(["time"], opts);
		}
	};
	TouchCommand = class extends Command {
		constructor(cmd, opts) {
			super(["touch", ...cmd], opts);
		}
	};
	TtlCommand = class extends Command {
		constructor(cmd, opts) {
			super(["ttl", ...cmd], opts);
		}
	};
	TypeCommand = class extends Command {
		constructor(cmd, opts) {
			super(["type", ...cmd], opts);
		}
	};
	UnlinkCommand = class extends Command {
		constructor(cmd, opts) {
			super(["unlink", ...cmd], opts);
		}
	};
	XAckCommand = class extends Command {
		constructor([key, group, id], opts) {
			const ids = Array.isArray(id) ? [...id] : [id];
			super([
				"XACK",
				key,
				group,
				...ids
			], opts);
		}
	};
	XAckDelCommand = class extends Command {
		constructor([key, group, opts, ...ids], cmdOpts) {
			const command = [
				"XACKDEL",
				key,
				group
			];
			command.push(opts.toUpperCase(), "IDS", ids.length, ...ids);
			super(command, cmdOpts);
		}
	};
	XAddCommand = class extends Command {
		constructor([key, id, entries, opts], commandOptions) {
			const command = ["XADD", key];
			if (opts) {
				if (opts.nomkStream) command.push("NOMKSTREAM");
				if (opts.trim) {
					command.push(opts.trim.type, opts.trim.comparison, opts.trim.threshold);
					if (opts.trim.limit !== void 0) command.push("LIMIT", opts.trim.limit);
				}
			}
			command.push(id);
			for (const [k, v] of Object.entries(entries)) command.push(k, v);
			super(command, commandOptions);
		}
	};
	XAutoClaim = class extends Command {
		constructor([key, group, consumer, minIdleTime, start, options], opts) {
			const commands = [];
			if (options?.count) commands.push("COUNT", options.count);
			if (options?.justId) commands.push("JUSTID");
			super([
				"XAUTOCLAIM",
				key,
				group,
				consumer,
				minIdleTime,
				start,
				...commands
			], opts);
		}
	};
	XClaimCommand = class extends Command {
		constructor([key, group, consumer, minIdleTime, id, options], opts) {
			const ids = Array.isArray(id) ? [...id] : [id];
			const commands = [];
			if (options?.idleMS) commands.push("IDLE", options.idleMS);
			if (options?.idleMS) commands.push("TIME", options.timeMS);
			if (options?.retryCount) commands.push("RETRYCOUNT", options.retryCount);
			if (options?.force) commands.push("FORCE");
			if (options?.justId) commands.push("JUSTID");
			if (options?.lastId) commands.push("LASTID", options.lastId);
			super([
				"XCLAIM",
				key,
				group,
				consumer,
				minIdleTime,
				...ids,
				...commands
			], opts);
		}
	};
	XDelCommand = class extends Command {
		constructor([key, ids], opts) {
			const cmds = Array.isArray(ids) ? [...ids] : [ids];
			super([
				"XDEL",
				key,
				...cmds
			], opts);
		}
	};
	XDelExCommand = class extends Command {
		constructor([key, opts, ...ids], cmdOpts) {
			const command = ["XDELEX", key];
			if (opts) command.push(opts.toUpperCase());
			command.push("IDS", ids.length, ...ids);
			super(command, cmdOpts);
		}
	};
	XGroupCommand = class extends Command {
		constructor([key, opts], commandOptions) {
			const command = ["XGROUP"];
			switch (opts.type) {
				case "CREATE":
					command.push("CREATE", key, opts.group, opts.id);
					if (opts.options) {
						if (opts.options.MKSTREAM) command.push("MKSTREAM");
						if (opts.options.ENTRIESREAD !== void 0) command.push("ENTRIESREAD", opts.options.ENTRIESREAD.toString());
					}
					break;
				case "CREATECONSUMER":
					command.push("CREATECONSUMER", key, opts.group, opts.consumer);
					break;
				case "DELCONSUMER":
					command.push("DELCONSUMER", key, opts.group, opts.consumer);
					break;
				case "DESTROY":
					command.push("DESTROY", key, opts.group);
					break;
				case "SETID":
					command.push("SETID", key, opts.group, opts.id);
					if (opts.options?.ENTRIESREAD !== void 0) command.push("ENTRIESREAD", opts.options.ENTRIESREAD.toString());
					break;
				default: throw new Error("Invalid XGROUP");
			}
			super(command, commandOptions);
		}
	};
	XInfoCommand = class extends Command {
		constructor([key, options], opts) {
			const cmds = [];
			if (options.type === "CONSUMERS") cmds.push("CONSUMERS", key, options.group);
			else cmds.push("GROUPS", key);
			super(["XINFO", ...cmds], opts);
		}
	};
	XLenCommand = class extends Command {
		constructor(cmd, opts) {
			super(["XLEN", ...cmd], opts);
		}
	};
	XPendingCommand = class extends Command {
		constructor([key, group, start, end, count, options], opts) {
			const consumers = options?.consumer === void 0 ? [] : Array.isArray(options.consumer) ? [...options.consumer] : [options.consumer];
			super([
				"XPENDING",
				key,
				group,
				...options?.idleTime ? ["IDLE", options.idleTime] : [],
				start,
				end,
				count,
				...consumers
			], opts);
		}
	};
	XRangeCommand = class extends Command {
		constructor([key, start, end, count], opts) {
			const command = [
				"XRANGE",
				key,
				start,
				end
			];
			if (typeof count === "number") command.push("COUNT", count);
			super(command, {
				deserialize: (result) => deserialize6(result),
				...opts
			});
		}
	};
	UNBALANCED_XREAD_ERR = "ERR Unbalanced XREAD list of streams: for each stream key an ID or '$' must be specified";
	XReadCommand = class extends Command {
		constructor([key, id, options], opts) {
			if (Array.isArray(key) && Array.isArray(id) && key.length !== id.length) throw new Error(UNBALANCED_XREAD_ERR);
			const commands = [];
			if (typeof options?.count === "number") commands.push("COUNT", options.count);
			if (typeof options?.blockMS === "number") commands.push("BLOCK", options.blockMS);
			commands.push("STREAMS", ...Array.isArray(key) ? [...key] : [key], ...Array.isArray(id) ? [...id] : [id]);
			super(["XREAD", ...commands], opts);
		}
	};
	UNBALANCED_XREADGROUP_ERR = "ERR Unbalanced XREADGROUP list of streams: for each stream key an ID or '$' must be specified";
	XReadGroupCommand = class extends Command {
		constructor([group, consumer, key, id, options], opts) {
			if (Array.isArray(key) && Array.isArray(id) && key.length !== id.length) throw new Error(UNBALANCED_XREADGROUP_ERR);
			const commands = [];
			if (typeof options?.count === "number") commands.push("COUNT", options.count);
			if (typeof options?.blockMS === "number") commands.push("BLOCK", options.blockMS);
			if (typeof options?.NOACK === "boolean" && options.NOACK) commands.push("NOACK");
			commands.push("STREAMS", ...Array.isArray(key) ? [...key] : [key], ...Array.isArray(id) ? [...id] : [id]);
			super([
				"XREADGROUP",
				"GROUP",
				group,
				consumer,
				...commands
			], opts);
		}
	};
	XRevRangeCommand = class extends Command {
		constructor([key, end, start, count], opts) {
			const command = [
				"XREVRANGE",
				key,
				end,
				start
			];
			if (typeof count === "number") command.push("COUNT", count);
			super(command, {
				deserialize: (result) => deserialize7(result),
				...opts
			});
		}
	};
	XTrimCommand = class extends Command {
		constructor([key, options], opts) {
			const { limit, strategy, threshold, exactness = "~" } = options;
			super([
				"XTRIM",
				key,
				strategy,
				exactness,
				threshold,
				...limit ? ["LIMIT", limit] : []
			], opts);
		}
	};
	ZAddCommand = class extends Command {
		constructor([key, arg1, ...arg2], opts) {
			const command = ["zadd", key];
			if ("nx" in arg1 && arg1.nx) command.push("nx");
			else if ("xx" in arg1 && arg1.xx) command.push("xx");
			if ("ch" in arg1 && arg1.ch) command.push("ch");
			if ("incr" in arg1 && arg1.incr) command.push("incr");
			if ("lt" in arg1 && arg1.lt) command.push("lt");
			else if ("gt" in arg1 && arg1.gt) command.push("gt");
			if ("score" in arg1 && "member" in arg1) command.push(arg1.score, arg1.member);
			command.push(...arg2.flatMap(({ score, member }) => [score, member]));
			super(command, opts);
		}
	};
	ZCardCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zcard", ...cmd], opts);
		}
	};
	ZCountCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zcount", ...cmd], opts);
		}
	};
	ZIncrByCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zincrby", ...cmd], opts);
		}
	};
	ZInterStoreCommand = class extends Command {
		constructor([destination, numKeys, keyOrKeys, opts], cmdOpts) {
			const command = [
				"zinterstore",
				destination,
				numKeys
			];
			if (Array.isArray(keyOrKeys)) command.push(...keyOrKeys);
			else command.push(keyOrKeys);
			if (opts) {
				if ("weights" in opts && opts.weights) command.push("weights", ...opts.weights);
				else if ("weight" in opts && typeof opts.weight === "number") command.push("weights", opts.weight);
				if ("aggregate" in opts) command.push("aggregate", opts.aggregate);
			}
			super(command, cmdOpts);
		}
	};
	ZLexCountCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zlexcount", ...cmd], opts);
		}
	};
	ZPopMaxCommand = class extends Command {
		constructor([key, count], opts) {
			const command = ["zpopmax", key];
			if (typeof count === "number") command.push(count);
			super(command, opts);
		}
	};
	ZPopMinCommand = class extends Command {
		constructor([key, count], opts) {
			const command = ["zpopmin", key];
			if (typeof count === "number") command.push(count);
			super(command, opts);
		}
	};
	ZRangeCommand = class extends Command {
		constructor([key, min, max, opts], cmdOpts) {
			const command = [
				"zrange",
				key,
				min,
				max
			];
			if (opts?.byScore) command.push("byscore");
			if (opts?.byLex) command.push("bylex");
			if (opts?.rev) command.push("rev");
			if (opts?.count !== void 0 && opts.offset !== void 0) command.push("limit", opts.offset, opts.count);
			if (opts?.withScores) command.push("withscores");
			super(command, cmdOpts);
		}
	};
	ZRankCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zrank", ...cmd], opts);
		}
	};
	ZRemCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zrem", ...cmd], opts);
		}
	};
	ZRemRangeByLexCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zremrangebylex", ...cmd], opts);
		}
	};
	ZRemRangeByRankCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zremrangebyrank", ...cmd], opts);
		}
	};
	ZRemRangeByScoreCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zremrangebyscore", ...cmd], opts);
		}
	};
	ZRevRankCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zrevrank", ...cmd], opts);
		}
	};
	ZScanCommand = class extends Command {
		constructor([key, cursor, opts], cmdOpts) {
			const command = [
				"zscan",
				key,
				cursor
			];
			if (opts?.match) command.push("match", opts.match);
			if (typeof opts?.count === "number") command.push("count", opts.count);
			super(command, {
				deserialize: deserializeScanResponse,
				...cmdOpts
			});
		}
	};
	ZScoreCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zscore", ...cmd], opts);
		}
	};
	ZUnionCommand = class extends Command {
		constructor([numKeys, keyOrKeys, opts], cmdOpts) {
			const command = ["zunion", numKeys];
			if (Array.isArray(keyOrKeys)) command.push(...keyOrKeys);
			else command.push(keyOrKeys);
			if (opts) {
				if ("weights" in opts && opts.weights) command.push("weights", ...opts.weights);
				else if ("weight" in opts && typeof opts.weight === "number") command.push("weights", opts.weight);
				if ("aggregate" in opts) command.push("aggregate", opts.aggregate);
				if (opts.withScores) command.push("withscores");
			}
			super(command, cmdOpts);
		}
	};
	ZUnionStoreCommand = class extends Command {
		constructor([destination, numKeys, keyOrKeys, opts], cmdOpts) {
			const command = [
				"zunionstore",
				destination,
				numKeys
			];
			if (Array.isArray(keyOrKeys)) command.push(...keyOrKeys);
			else command.push(keyOrKeys);
			if (opts) {
				if ("weights" in opts && opts.weights) command.push("weights", ...opts.weights);
				else if ("weight" in opts && typeof opts.weight === "number") command.push("weights", opts.weight);
				if ("aggregate" in opts) command.push("aggregate", opts.aggregate);
			}
			super(command, cmdOpts);
		}
	};
	ZDiffStoreCommand = class extends Command {
		constructor(cmd, opts) {
			super(["zdiffstore", ...cmd], opts);
		}
	};
	ZMScoreCommand = class extends Command {
		constructor(cmd, opts) {
			const [key, members] = cmd;
			super([
				"zmscore",
				key,
				...members
			], opts);
		}
	};
	Pipeline = class {
		client;
		commands;
		commandOptions;
		multiExec;
		constructor(opts) {
			this.client = opts.client;
			this.commands = [];
			this.commandOptions = opts.commandOptions;
			this.multiExec = opts.multiExec ?? false;
			if (this.commandOptions?.latencyLogging) {
				const originalExec = this.exec.bind(this);
				this.exec = async (options) => {
					const start = performance.now();
					const result = await (options ? originalExec(options) : originalExec());
					const loggerResult = (performance.now() - start).toFixed(2);
					console.log(`Latency for \x1B[38;2;19;185;39m${this.multiExec ? ["MULTI-EXEC"] : ["PIPELINE"].toString().toUpperCase()}\x1B[0m: \x1B[38;2;0;255;255m${loggerResult} ms\x1B[0m`);
					return result;
				};
			}
		}
		exec = async (options) => {
			if (this.commands.length === 0) throw new Error("Pipeline is empty");
			const path = this.multiExec ? ["multi-exec"] : ["pipeline"];
			const res = await this.client.request({
				path,
				body: Object.values(this.commands).map((c) => c.command)
			});
			return options?.keepErrors ? res.map(({ error, result }, i) => {
				return {
					error,
					result: this.commands[i].deserialize(result)
				};
			}) : res.map(({ error, result }, i) => {
				if (error) throw new UpstashError(`Command ${i + 1} [ ${this.commands[i].command[0]} ] failed: ${error}`);
				return this.commands[i].deserialize(result);
			});
		};
		/**
		* Returns the length of pipeline before the execution
		*/
		length() {
			return this.commands.length;
		}
		/**
		* Pushes a command into the pipeline and returns a chainable instance of the
		* pipeline
		*/
		chain(command) {
			this.commands.push(command);
			return this;
		}
		/**
		* @see https://redis.io/commands/append
		*/
		append = (...args) => this.chain(new AppendCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/bitcount
		*/
		bitcount = (...args) => this.chain(new BitCountCommand(args, this.commandOptions));
		/**
		* Returns an instance that can be used to execute `BITFIELD` commands on one key.
		*
		* @example
		* ```typescript
		* redis.set("mykey", 0);
		* const result = await redis.pipeline()
		*   .bitfield("mykey")
		*   .set("u4", 0, 16)
		*   .incr("u4", "#1", 1)
		*   .exec();
		* console.log(result); // [[0, 1]]
		* ```
		*
		* @see https://redis.io/commands/bitfield
		*/
		bitfield = (...args) => new BitFieldCommand(args, this.client, this.commandOptions, this.chain.bind(this));
		/**
		* @see https://redis.io/commands/bitop
		*/
		bitop = (op, destinationKey, sourceKey, ...sourceKeys) => this.chain(new BitOpCommand([
			op,
			destinationKey,
			sourceKey,
			...sourceKeys
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/bitpos
		*/
		bitpos = (...args) => this.chain(new BitPosCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/client-setinfo
		*/
		clientSetinfo = (...args) => this.chain(new ClientSetInfoCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/copy
		*/
		copy = (...args) => this.chain(new CopyCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zdiffstore
		*/
		zdiffstore = (...args) => this.chain(new ZDiffStoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/dbsize
		*/
		dbsize = () => this.chain(new DBSizeCommand(this.commandOptions));
		/**
		* @see https://redis.io/commands/decr
		*/
		decr = (...args) => this.chain(new DecrCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/decrby
		*/
		decrby = (...args) => this.chain(new DecrByCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/del
		*/
		del = (...args) => this.chain(new DelCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/echo
		*/
		echo = (...args) => this.chain(new EchoCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/eval_ro
		*/
		evalRo = (...args) => this.chain(new EvalROCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/eval
		*/
		eval = (...args) => this.chain(new EvalCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/evalsha_ro
		*/
		evalshaRo = (...args) => this.chain(new EvalshaROCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/evalsha
		*/
		evalsha = (...args) => this.chain(new EvalshaCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/exists
		*/
		exists = (...args) => this.chain(new ExistsCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/expire
		*/
		expire = (...args) => this.chain(new ExpireCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/expireat
		*/
		expireat = (...args) => this.chain(new ExpireAtCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/flushall
		*/
		flushall = (args) => this.chain(new FlushAllCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/flushdb
		*/
		flushdb = (...args) => this.chain(new FlushDBCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/geoadd
		*/
		geoadd = (...args) => this.chain(new GeoAddCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/geodist
		*/
		geodist = (...args) => this.chain(new GeoDistCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/geopos
		*/
		geopos = (...args) => this.chain(new GeoPosCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/geohash
		*/
		geohash = (...args) => this.chain(new GeoHashCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/geosearch
		*/
		geosearch = (...args) => this.chain(new GeoSearchCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/geosearchstore
		*/
		geosearchstore = (...args) => this.chain(new GeoSearchStoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/get
		*/
		get = (...args) => this.chain(new GetCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/getbit
		*/
		getbit = (...args) => this.chain(new GetBitCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/getdel
		*/
		getdel = (...args) => this.chain(new GetDelCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/getex
		*/
		getex = (...args) => this.chain(new GetExCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/getrange
		*/
		getrange = (...args) => this.chain(new GetRangeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/getset
		*/
		getset = (key, value) => this.chain(new GetSetCommand([key, value], this.commandOptions));
		/**
		* @see https://redis.io/commands/hdel
		*/
		hdel = (...args) => this.chain(new HDelCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hexists
		*/
		hexists = (...args) => this.chain(new HExistsCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hexpire
		*/
		hexpire = (...args) => this.chain(new HExpireCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hexpireat
		*/
		hexpireat = (...args) => this.chain(new HExpireAtCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hexpiretime
		*/
		hexpiretime = (...args) => this.chain(new HExpireTimeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/httl
		*/
		httl = (...args) => this.chain(new HTtlCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hpexpire
		*/
		hpexpire = (...args) => this.chain(new HPExpireCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hpexpireat
		*/
		hpexpireat = (...args) => this.chain(new HPExpireAtCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hpexpiretime
		*/
		hpexpiretime = (...args) => this.chain(new HPExpireTimeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hpttl
		*/
		hpttl = (...args) => this.chain(new HPTtlCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hpersist
		*/
		hpersist = (...args) => this.chain(new HPersistCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hget
		*/
		hget = (...args) => this.chain(new HGetCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hgetall
		*/
		hgetall = (...args) => this.chain(new HGetAllCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hgetdel
		*/
		hgetdel = (...args) => this.chain(new HGetDelCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hgetex
		*/
		hgetex = (...args) => this.chain(new HGetExCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hincrby
		*/
		hincrby = (...args) => this.chain(new HIncrByCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hincrbyfloat
		*/
		hincrbyfloat = (...args) => this.chain(new HIncrByFloatCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hkeys
		*/
		hkeys = (...args) => this.chain(new HKeysCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hlen
		*/
		hlen = (...args) => this.chain(new HLenCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hmget
		*/
		hmget = (...args) => this.chain(new HMGetCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hmset
		*/
		hmset = (key, kv) => this.chain(new HMSetCommand([key, kv], this.commandOptions));
		/**
		* @see https://redis.io/commands/hrandfield
		*/
		hrandfield = (key, count, withValues) => this.chain(new HRandFieldCommand([
			key,
			count,
			withValues
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/hscan
		*/
		hscan = (...args) => this.chain(new HScanCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hset
		*/
		hset = (key, kv) => this.chain(new HSetCommand([key, kv], this.commandOptions));
		/**
		* @see https://redis.io/commands/hsetex
		*/
		hsetex = (...args) => this.chain(new HSetExCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hsetnx
		*/
		hsetnx = (key, field, value) => this.chain(new HSetNXCommand([
			key,
			field,
			value
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/hstrlen
		*/
		hstrlen = (...args) => this.chain(new HStrLenCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/hvals
		*/
		hvals = (...args) => this.chain(new HValsCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/incr
		*/
		incr = (...args) => this.chain(new IncrCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/incrby
		*/
		incrby = (...args) => this.chain(new IncrByCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/incrbyfloat
		*/
		incrbyfloat = (...args) => this.chain(new IncrByFloatCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/keys
		*/
		keys = (...args) => this.chain(new KeysCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/lindex
		*/
		lindex = (...args) => this.chain(new LIndexCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/linsert
		*/
		linsert = (key, direction, pivot, value) => this.chain(new LInsertCommand([
			key,
			direction,
			pivot,
			value
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/llen
		*/
		llen = (...args) => this.chain(new LLenCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/lmove
		*/
		lmove = (...args) => this.chain(new LMoveCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/lpop
		*/
		lpop = (...args) => this.chain(new LPopCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/lmpop
		*/
		lmpop = (...args) => this.chain(new LmPopCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/lpos
		*/
		lpos = (...args) => this.chain(new LPosCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/lpush
		*/
		lpush = (key, ...elements) => this.chain(new LPushCommand([key, ...elements], this.commandOptions));
		/**
		* @see https://redis.io/commands/lpushx
		*/
		lpushx = (key, ...elements) => this.chain(new LPushXCommand([key, ...elements], this.commandOptions));
		/**
		* @see https://redis.io/commands/lrange
		*/
		lrange = (...args) => this.chain(new LRangeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/lrem
		*/
		lrem = (key, count, value) => this.chain(new LRemCommand([
			key,
			count,
			value
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/lset
		*/
		lset = (key, index, value) => this.chain(new LSetCommand([
			key,
			index,
			value
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/ltrim
		*/
		ltrim = (...args) => this.chain(new LTrimCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/mget
		*/
		mget = (...args) => this.chain(new MGetCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/mset
		*/
		mset = (kv) => this.chain(new MSetCommand([kv], this.commandOptions));
		/**
		* @see https://redis.io/commands/msetnx
		*/
		msetnx = (kv) => this.chain(new MSetNXCommand([kv], this.commandOptions));
		/**
		* @see https://redis.io/commands/persist
		*/
		persist = (...args) => this.chain(new PersistCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/pexpire
		*/
		pexpire = (...args) => this.chain(new PExpireCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/pexpireat
		*/
		pexpireat = (...args) => this.chain(new PExpireAtCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/pfadd
		*/
		pfadd = (...args) => this.chain(new PfAddCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/pfcount
		*/
		pfcount = (...args) => this.chain(new PfCountCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/pfmerge
		*/
		pfmerge = (...args) => this.chain(new PfMergeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/ping
		*/
		ping = (args) => this.chain(new PingCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/psetex
		*/
		psetex = (key, ttl, value) => this.chain(new PSetEXCommand([
			key,
			ttl,
			value
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/pttl
		*/
		pttl = (...args) => this.chain(new PTtlCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/publish
		*/
		publish = (...args) => this.chain(new PublishCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/randomkey
		*/
		randomkey = () => this.chain(new RandomKeyCommand(this.commandOptions));
		/**
		* @see https://redis.io/commands/rename
		*/
		rename = (...args) => this.chain(new RenameCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/renamenx
		*/
		renamenx = (...args) => this.chain(new RenameNXCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/rpop
		*/
		rpop = (...args) => this.chain(new RPopCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/rpush
		*/
		rpush = (key, ...elements) => this.chain(new RPushCommand([key, ...elements], this.commandOptions));
		/**
		* @see https://redis.io/commands/rpushx
		*/
		rpushx = (key, ...elements) => this.chain(new RPushXCommand([key, ...elements], this.commandOptions));
		/**
		* @see https://redis.io/commands/sadd
		*/
		sadd = (key, member, ...members) => this.chain(new SAddCommand([
			key,
			member,
			...members
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/scan
		*/
		scan = (...args) => this.chain(new ScanCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/scard
		*/
		scard = (...args) => this.chain(new SCardCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/script-exists
		*/
		scriptExists = (...args) => this.chain(new ScriptExistsCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/script-flush
		*/
		scriptFlush = (...args) => this.chain(new ScriptFlushCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/script-load
		*/
		scriptLoad = (...args) => this.chain(new ScriptLoadCommand(args, this.commandOptions));
		sdiff = (...args) => this.chain(new SDiffCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/sdiffstore
		*/
		sdiffstore = (...args) => this.chain(new SDiffStoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/set
		*/
		set = (key, value, opts) => this.chain(new SetCommand([
			key,
			value,
			opts
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/setbit
		*/
		setbit = (...args) => this.chain(new SetBitCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/setex
		*/
		setex = (key, ttl, value) => this.chain(new SetExCommand([
			key,
			ttl,
			value
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/setnx
		*/
		setnx = (key, value) => this.chain(new SetNxCommand([key, value], this.commandOptions));
		/**
		* @see https://redis.io/commands/setrange
		*/
		setrange = (...args) => this.chain(new SetRangeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/sinter
		*/
		sinter = (...args) => this.chain(new SInterCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/sintercard
		*/
		sintercard = (...args) => this.chain(new SInterCardCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/sinterstore
		*/
		sinterstore = (...args) => this.chain(new SInterStoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/sismember
		*/
		sismember = (key, member) => this.chain(new SIsMemberCommand([key, member], this.commandOptions));
		/**
		* @see https://redis.io/commands/smembers
		*/
		smembers = (...args) => this.chain(new SMembersCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/smismember
		*/
		smismember = (key, members) => this.chain(new SMIsMemberCommand([key, members], this.commandOptions));
		/**
		* @see https://redis.io/commands/smove
		*/
		smove = (source, destination, member) => this.chain(new SMoveCommand([
			source,
			destination,
			member
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/spop
		*/
		spop = (...args) => this.chain(new SPopCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/srandmember
		*/
		srandmember = (...args) => this.chain(new SRandMemberCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/srem
		*/
		srem = (key, ...members) => this.chain(new SRemCommand([key, ...members], this.commandOptions));
		/**
		* @see https://redis.io/commands/sscan
		*/
		sscan = (...args) => this.chain(new SScanCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/strlen
		*/
		strlen = (...args) => this.chain(new StrLenCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/sunion
		*/
		sunion = (...args) => this.chain(new SUnionCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/sunionstore
		*/
		sunionstore = (...args) => this.chain(new SUnionStoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/time
		*/
		time = () => this.chain(new TimeCommand(this.commandOptions));
		/**
		* @see https://redis.io/commands/touch
		*/
		touch = (...args) => this.chain(new TouchCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/ttl
		*/
		ttl = (...args) => this.chain(new TtlCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/type
		*/
		type = (...args) => this.chain(new TypeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/unlink
		*/
		unlink = (...args) => this.chain(new UnlinkCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zadd
		*/
		zadd = (...args) => {
			if ("score" in args[1]) return this.chain(new ZAddCommand([
				args[0],
				args[1],
				...args.slice(2)
			], this.commandOptions));
			return this.chain(new ZAddCommand([
				args[0],
				args[1],
				...args.slice(2)
			], this.commandOptions));
		};
		/**
		* @see https://redis.io/commands/xadd
		*/
		xadd = (...args) => this.chain(new XAddCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xack
		*/
		xack = (...args) => this.chain(new XAckCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xackdel
		*/
		xackdel = (...args) => this.chain(new XAckDelCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xdel
		*/
		xdel = (...args) => this.chain(new XDelCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xdelex
		*/
		xdelex = (...args) => this.chain(new XDelExCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xgroup
		*/
		xgroup = (...args) => this.chain(new XGroupCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xread
		*/
		xread = (...args) => this.chain(new XReadCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xreadgroup
		*/
		xreadgroup = (...args) => this.chain(new XReadGroupCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xinfo
		*/
		xinfo = (...args) => this.chain(new XInfoCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xlen
		*/
		xlen = (...args) => this.chain(new XLenCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xpending
		*/
		xpending = (...args) => this.chain(new XPendingCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xclaim
		*/
		xclaim = (...args) => this.chain(new XClaimCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xautoclaim
		*/
		xautoclaim = (...args) => this.chain(new XAutoClaim(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xtrim
		*/
		xtrim = (...args) => this.chain(new XTrimCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xrange
		*/
		xrange = (...args) => this.chain(new XRangeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/xrevrange
		*/
		xrevrange = (...args) => this.chain(new XRevRangeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zcard
		*/
		zcard = (...args) => this.chain(new ZCardCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zcount
		*/
		zcount = (...args) => this.chain(new ZCountCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zincrby
		*/
		zincrby = (key, increment, member) => this.chain(new ZIncrByCommand([
			key,
			increment,
			member
		], this.commandOptions));
		/**
		* @see https://redis.io/commands/zinterstore
		*/
		zinterstore = (...args) => this.chain(new ZInterStoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zlexcount
		*/
		zlexcount = (...args) => this.chain(new ZLexCountCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zmscore
		*/
		zmscore = (...args) => this.chain(new ZMScoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zpopmax
		*/
		zpopmax = (...args) => this.chain(new ZPopMaxCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zpopmin
		*/
		zpopmin = (...args) => this.chain(new ZPopMinCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zrange
		*/
		zrange = (...args) => this.chain(new ZRangeCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zrank
		*/
		zrank = (key, member) => this.chain(new ZRankCommand([key, member], this.commandOptions));
		/**
		* @see https://redis.io/commands/zrem
		*/
		zrem = (key, ...members) => this.chain(new ZRemCommand([key, ...members], this.commandOptions));
		/**
		* @see https://redis.io/commands/zremrangebylex
		*/
		zremrangebylex = (...args) => this.chain(new ZRemRangeByLexCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zremrangebyrank
		*/
		zremrangebyrank = (...args) => this.chain(new ZRemRangeByRankCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zremrangebyscore
		*/
		zremrangebyscore = (...args) => this.chain(new ZRemRangeByScoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zrevrank
		*/
		zrevrank = (key, member) => this.chain(new ZRevRankCommand([key, member], this.commandOptions));
		/**
		* @see https://redis.io/commands/zscan
		*/
		zscan = (...args) => this.chain(new ZScanCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zscore
		*/
		zscore = (key, member) => this.chain(new ZScoreCommand([key, member], this.commandOptions));
		/**
		* @see https://redis.io/commands/zunionstore
		*/
		zunionstore = (...args) => this.chain(new ZUnionStoreCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/zunion
		*/
		zunion = (...args) => this.chain(new ZUnionCommand(args, this.commandOptions));
		/**
		* @see https://redis.io/commands/?group=json
		*/
		get json() {
			return {
				/**
				* @see https://redis.io/commands/json.arrappend
				*/
				arrappend: (...args) => this.chain(new JsonArrAppendCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.arrindex
				*/
				arrindex: (...args) => this.chain(new JsonArrIndexCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.arrinsert
				*/
				arrinsert: (...args) => this.chain(new JsonArrInsertCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.arrlen
				*/
				arrlen: (...args) => this.chain(new JsonArrLenCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.arrpop
				*/
				arrpop: (...args) => this.chain(new JsonArrPopCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.arrtrim
				*/
				arrtrim: (...args) => this.chain(new JsonArrTrimCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.clear
				*/
				clear: (...args) => this.chain(new JsonClearCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.del
				*/
				del: (...args) => this.chain(new JsonDelCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.forget
				*/
				forget: (...args) => this.chain(new JsonForgetCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.get
				*/
				get: (...args) => this.chain(new JsonGetCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.merge
				*/
				merge: (...args) => this.chain(new JsonMergeCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.mget
				*/
				mget: (...args) => this.chain(new JsonMGetCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.mset
				*/
				mset: (...args) => this.chain(new JsonMSetCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.numincrby
				*/
				numincrby: (...args) => this.chain(new JsonNumIncrByCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.nummultby
				*/
				nummultby: (...args) => this.chain(new JsonNumMultByCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.objkeys
				*/
				objkeys: (...args) => this.chain(new JsonObjKeysCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.objlen
				*/
				objlen: (...args) => this.chain(new JsonObjLenCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.resp
				*/
				resp: (...args) => this.chain(new JsonRespCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.set
				*/
				set: (...args) => this.chain(new JsonSetCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.strappend
				*/
				strappend: (...args) => this.chain(new JsonStrAppendCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.strlen
				*/
				strlen: (...args) => this.chain(new JsonStrLenCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.toggle
				*/
				toggle: (...args) => this.chain(new JsonToggleCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/commands/json.type
				*/
				type: (...args) => this.chain(new JsonTypeCommand(args, this.commandOptions))
			};
		}
		get functions() {
			return {
				/**
				* @see https://redis.io/docs/latest/commands/function-load/
				*/
				load: (...args) => this.chain(new FunctionLoadCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/docs/latest/commands/function-list/
				*/
				list: (...args) => this.chain(new FunctionListCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/docs/latest/commands/function-delete/
				*/
				delete: (...args) => this.chain(new FunctionDeleteCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/docs/latest/commands/function-flush/
				*/
				flush: () => this.chain(new FunctionFlushCommand(this.commandOptions)),
				/**
				* @see https://redis.io/docs/latest/commands/function-stats/
				*/
				stats: () => this.chain(new FunctionStatsCommand(this.commandOptions)),
				/**
				* @see https://redis.io/docs/latest/commands/fcall/
				*/
				call: (...args) => this.chain(new FCallCommand(args, this.commandOptions)),
				/**
				* @see https://redis.io/docs/latest/commands/fcall_ro/
				*/
				callRo: (...args) => this.chain(new FCallRoCommand(args, this.commandOptions))
			};
		}
	};
	MAX_PIPELINE_SIZE = 1e3;
	READ_COMMANDS = /* @__PURE__ */ new Set([
		"get",
		"getrange",
		"mget",
		"strlen",
		"bitcount",
		"bitpos",
		"getbit",
		"hexists",
		"hget",
		"hgetall",
		"hkeys",
		"hlen",
		"hmget",
		"hrandfield",
		"hscan",
		"hstrlen",
		"httl",
		"hvals",
		"hexpiretime",
		"hpexpiretime",
		"hpttl",
		"lindex",
		"llen",
		"lpos",
		"lrange",
		"scard",
		"sdiff",
		"sinter",
		"sintercard",
		"sismember",
		"smembers",
		"smismember",
		"srandmember",
		"sscan",
		"sunion",
		"zcard",
		"zcount",
		"zlexcount",
		"zmscore",
		"zrange",
		"zrank",
		"zrevrank",
		"zscan",
		"zscore",
		"zunion",
		"exists",
		"type",
		"ttl",
		"pttl",
		"randomkey",
		"touch",
		"pfcount",
		"xinfo",
		"xlen",
		"xpending",
		"xrange",
		"xread",
		"xrevrange",
		"geodist",
		"geohash",
		"geopos",
		"geosearch",
		"scriptExists",
		"evalRo",
		"evalshaRo",
		"dbsize",
		"echo",
		"ping",
		"time",
		"scan",
		"keys",
		"arrindex",
		"arrlen",
		"objkeys",
		"objlen",
		"resp",
		"list",
		"stats",
		"callRo"
	]);
	EXCLUDE_COMMANDS = /* @__PURE__ */ new Set([
		"scan",
		"keys",
		"flushdb",
		"flushall",
		"dbsize",
		"hscan",
		"hgetall",
		"hkeys",
		"lrange",
		"sscan",
		"smembers",
		"xrange",
		"xrevrange",
		"zscan",
		"zrange",
		"exec"
	]);
	AutoPipelineExecutor = class {
		pipelinePromises = /* @__PURE__ */ new WeakMap();
		activeReadPipeline = null;
		activeWritePipeline = null;
		readIndex = 0;
		writeIndex = 0;
		redis;
		pipeline;
		pipelineCounter = 0;
		constructor(redis) {
			this.redis = redis;
			this.pipeline = redis.pipeline();
		}
		async withAutoPipeline(commandMode, executeWithPipeline) {
			const isRead = commandMode === "read";
			const activePipeline = isRead ? this.activeReadPipeline : this.activeWritePipeline;
			const pipeline = activePipeline ?? this.redis.pipeline();
			if (!activePipeline) {
				if (isRead) {
					this.activeReadPipeline = pipeline;
					this.readIndex = 0;
				} else {
					this.activeWritePipeline = pipeline;
					this.writeIndex = 0;
				}
			}
			const index = isRead ? this.readIndex++ : this.writeIndex++;
			executeWithPipeline(pipeline);
			if (isRead && this.readIndex >= MAX_PIPELINE_SIZE) this.activeReadPipeline = null;
			else if (!isRead && this.writeIndex >= MAX_PIPELINE_SIZE) this.activeWritePipeline = null;
			const commandResult = (await this.deferExecution().then(() => {
				if (!this.pipelinePromises.has(pipeline)) {
					const pipelinePromise = pipeline.exec({ keepErrors: true });
					this.pipelineCounter += 1;
					this.pipelinePromises.set(pipeline, pipelinePromise);
					if (this.activeReadPipeline === pipeline) this.activeReadPipeline = null;
					if (this.activeWritePipeline === pipeline) this.activeWritePipeline = null;
				}
				return this.pipelinePromises.get(pipeline);
			}))[index];
			if (commandResult.error) throw new UpstashError(`Command failed: ${commandResult.error}`);
			return commandResult.result;
		}
		async deferExecution() {
			await Promise.resolve();
			await Promise.resolve();
		}
	};
	PSubscribeCommand = class extends Command {
		constructor(cmd, opts) {
			const sseHeaders = {
				Accept: "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive"
			};
			super([], {
				...opts,
				headers: sseHeaders,
				path: ["psubscribe", ...cmd],
				streamOptions: {
					isStreaming: true,
					onMessage: opts?.streamOptions?.onMessage,
					signal: opts?.streamOptions?.signal
				}
			});
		}
	};
	Subscriber = class extends EventTarget {
		subscriptions;
		client;
		listeners;
		opts;
		constructor(client, channels, isPattern = false, opts) {
			super();
			this.client = client;
			this.subscriptions = /* @__PURE__ */ new Map();
			this.listeners = /* @__PURE__ */ new Map();
			this.opts = opts;
			for (const channel of channels) if (isPattern) this.subscribeToPattern(channel);
			else this.subscribeToChannel(channel);
		}
		subscribeToChannel(channel) {
			const controller = new AbortController();
			const command = new SubscribeCommand([channel], { streamOptions: {
				signal: controller.signal,
				onMessage: (data) => this.handleMessage(data, false)
			} });
			command.exec(this.client).catch((error) => {
				if (error.name !== "AbortError") this.dispatchToListeners("error", error);
			});
			this.subscriptions.set(channel, {
				command,
				controller,
				isPattern: false
			});
		}
		subscribeToPattern(pattern) {
			const controller = new AbortController();
			const command = new PSubscribeCommand([pattern], { streamOptions: {
				signal: controller.signal,
				onMessage: (data) => this.handleMessage(data, true)
			} });
			command.exec(this.client).catch((error) => {
				if (error.name !== "AbortError") this.dispatchToListeners("error", error);
			});
			this.subscriptions.set(pattern, {
				command,
				controller,
				isPattern: true
			});
		}
		handleMessage(data, isPattern) {
			const messageData = data.replace(/^data:\s*/, "");
			const firstCommaIndex = messageData.indexOf(",");
			const secondCommaIndex = messageData.indexOf(",", firstCommaIndex + 1);
			const thirdCommaIndex = isPattern ? messageData.indexOf(",", secondCommaIndex + 1) : -1;
			if (firstCommaIndex !== -1 && secondCommaIndex !== -1) {
				const type = messageData.slice(0, firstCommaIndex);
				if (isPattern && type === "pmessage" && thirdCommaIndex !== -1) {
					const pattern = messageData.slice(firstCommaIndex + 1, secondCommaIndex);
					const channel = messageData.slice(secondCommaIndex + 1, thirdCommaIndex);
					const messageStr = messageData.slice(thirdCommaIndex + 1);
					try {
						const message = this.opts?.automaticDeserialization === false ? messageStr : JSON.parse(messageStr);
						this.dispatchToListeners("pmessage", {
							pattern,
							channel,
							message
						});
						this.dispatchToListeners(`pmessage:${pattern}`, {
							pattern,
							channel,
							message
						});
					} catch (error) {
						this.dispatchToListeners("error", /* @__PURE__ */ new Error(`Failed to parse message: ${error}`));
					}
				} else {
					const channel = messageData.slice(firstCommaIndex + 1, secondCommaIndex);
					const messageStr = messageData.slice(secondCommaIndex + 1);
					try {
						if (type === "subscribe" || type === "psubscribe" || type === "unsubscribe" || type === "punsubscribe") {
							const count = Number.parseInt(messageStr);
							this.dispatchToListeners(type, count);
						} else {
							const message = this.opts?.automaticDeserialization === false ? messageStr : parseWithTryCatch(messageStr);
							this.dispatchToListeners(type, {
								channel,
								message
							});
							this.dispatchToListeners(`${type}:${channel}`, {
								channel,
								message
							});
						}
					} catch (error) {
						this.dispatchToListeners("error", /* @__PURE__ */ new Error(`Failed to parse message: ${error}`));
					}
				}
			}
		}
		dispatchToListeners(type, data) {
			const listeners = this.listeners.get(type);
			if (listeners) for (const listener of listeners) listener(data);
		}
		on(type, listener) {
			if (!this.listeners.has(type)) this.listeners.set(type, /* @__PURE__ */ new Set());
			this.listeners.get(type)?.add(listener);
		}
		removeAllListeners() {
			this.listeners.clear();
		}
		async unsubscribe(channels) {
			if (channels) for (const channel of channels) {
				const subscription = this.subscriptions.get(channel);
				if (subscription) {
					try {
						subscription.controller.abort();
					} catch {}
					this.subscriptions.delete(channel);
				}
			}
			else {
				for (const subscription of this.subscriptions.values()) try {
					subscription.controller.abort();
				} catch {}
				this.subscriptions.clear();
				this.removeAllListeners();
			}
		}
		getSubscribedChannels() {
			return [...this.subscriptions.keys()];
		}
	};
	SubscribeCommand = class extends Command {
		constructor(cmd, opts) {
			const sseHeaders = {
				Accept: "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive"
			};
			super([], {
				...opts,
				headers: sseHeaders,
				path: ["subscribe", ...cmd],
				streamOptions: {
					isStreaming: true,
					onMessage: opts?.streamOptions?.onMessage,
					signal: opts?.streamOptions?.signal
				}
			});
		}
	};
	parseWithTryCatch = (str) => {
		try {
			return JSON.parse(str);
		} catch {
			return str;
		}
	};
	Script = class {
		script;
		/**
		* @deprecated This property is initialized to an empty string and will be set in the init method
		* asynchronously. Do not use this property immidiately after the constructor.
		*
		* This property is only exposed for backwards compatibility and will be removed in the
		* future major release.
		*/
		sha1;
		initPromise;
		redis;
		constructor(redis, script) {
			this.redis = redis;
			this.script = script;
			this.sha1 = "";
			this.init(script);
		}
		/**
		* Initialize the script by computing its SHA-1 hash.
		*/
		init(script) {
			if (!this.initPromise) this.initPromise = this.digest(script).then((sha1) => {
				this.sha1 = sha1;
			});
			return this.initPromise;
		}
		/**
		* Send an `EVAL` command to redis.
		*/
		async eval(keys, args) {
			await this.init(this.script);
			return await this.redis.eval(this.script, keys, args);
		}
		/**
		* Calculates the sha1 hash of the script and then calls `EVALSHA`.
		*/
		async evalsha(keys, args) {
			await this.init(this.script);
			return await this.redis.evalsha(this.sha1, keys, args);
		}
		/**
		* Optimistically try to run `EVALSHA` first.
		* If the script is not loaded in redis, it will fall back and try again with `EVAL`.
		*
		* Following calls will be able to use the cached script
		*/
		async exec(keys, args) {
			await this.init(this.script);
			return await this.redis.evalsha(this.sha1, keys, args).catch(async (error) => {
				if (error instanceof Error && error.message.toLowerCase().includes("noscript")) return await this.redis.eval(this.script, keys, args);
				throw error;
			});
		}
		/**
		* Compute the sha1 hash of the script and return its hex representation.
		*/
		async digest(s) {
			const data = new TextEncoder().encode(s);
			const hashBuffer = await subtle.digest("SHA-1", data);
			return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
		}
	};
	ScriptRO = class {
		script;
		/**
		* @deprecated This property is initialized to an empty string and will be set in the init method
		* asynchronously. Do not use this property immidiately after the constructor.
		*
		* This property is only exposed for backwards compatibility and will be removed in the
		* future major release.
		*/
		sha1;
		initPromise;
		redis;
		constructor(redis, script) {
			this.redis = redis;
			this.sha1 = "";
			this.script = script;
			this.init(script);
		}
		init(script) {
			if (!this.initPromise) this.initPromise = this.digest(script).then((sha1) => {
				this.sha1 = sha1;
			});
			return this.initPromise;
		}
		/**
		* Send an `EVAL_RO` command to redis.
		*/
		async evalRo(keys, args) {
			await this.init(this.script);
			return await this.redis.evalRo(this.script, keys, args);
		}
		/**
		* Calculates the sha1 hash of the script and then calls `EVALSHA_RO`.
		*/
		async evalshaRo(keys, args) {
			await this.init(this.script);
			return await this.redis.evalshaRo(this.sha1, keys, args);
		}
		/**
		* Optimistically try to run `EVALSHA_RO` first.
		* If the script is not loaded in redis, it will fall back and try again with `EVAL_RO`.
		*
		* Following calls will be able to use the cached script
		*/
		async exec(keys, args) {
			await this.init(this.script);
			return await this.redis.evalshaRo(this.sha1, keys, args).catch(async (error) => {
				if (error instanceof Error && error.message.toLowerCase().includes("noscript")) return await this.redis.evalRo(this.script, keys, args);
				throw error;
			});
		}
		/**
		* Compute the sha1 hash of the script and return its hex representation.
		*/
		async digest(s) {
			const data = new TextEncoder().encode(s);
			const hashBuffer = await subtle.digest("SHA-1", data);
			return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
		}
	};
	Redis = class {
		client;
		opts;
		enableTelemetry;
		enableAutoPipelining;
		/**
		* Create a new redis client
		*
		* @example
		* ```typescript
		* const redis = new Redis({
		*  url: "<UPSTASH_REDIS_REST_URL>",
		*  token: "<UPSTASH_REDIS_REST_TOKEN>",
		* });
		* ```
		*/
		constructor(client, opts) {
			this.client = client;
			this.opts = opts;
			this.enableTelemetry = opts?.enableTelemetry ?? true;
			if (opts?.readYourWrites === false) this.client.readYourWrites = false;
			this.enableAutoPipelining = opts?.enableAutoPipelining ?? true;
		}
		get readYourWritesSyncToken() {
			return this.client.upstashSyncToken;
		}
		set readYourWritesSyncToken(session) {
			this.client.upstashSyncToken = session;
		}
		get json() {
			return {
				/**
				* @see https://redis.io/commands/json.arrappend
				*/
				arrappend: (...args) => new JsonArrAppendCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.arrindex
				*/
				arrindex: (...args) => new JsonArrIndexCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.arrinsert
				*/
				arrinsert: (...args) => new JsonArrInsertCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.arrlen
				*/
				arrlen: (...args) => new JsonArrLenCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.arrpop
				*/
				arrpop: (...args) => new JsonArrPopCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.arrtrim
				*/
				arrtrim: (...args) => new JsonArrTrimCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.clear
				*/
				clear: (...args) => new JsonClearCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.del
				*/
				del: (...args) => new JsonDelCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.forget
				*/
				forget: (...args) => new JsonForgetCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.get
				*/
				get: (...args) => new JsonGetCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.merge
				*/
				merge: (...args) => new JsonMergeCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.mget
				*/
				mget: (...args) => new JsonMGetCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.mset
				*/
				mset: (...args) => new JsonMSetCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.numincrby
				*/
				numincrby: (...args) => new JsonNumIncrByCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.nummultby
				*/
				nummultby: (...args) => new JsonNumMultByCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.objkeys
				*/
				objkeys: (...args) => new JsonObjKeysCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.objlen
				*/
				objlen: (...args) => new JsonObjLenCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.resp
				*/
				resp: (...args) => new JsonRespCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.set
				*/
				set: (...args) => new JsonSetCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.strappend
				*/
				strappend: (...args) => new JsonStrAppendCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.strlen
				*/
				strlen: (...args) => new JsonStrLenCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.toggle
				*/
				toggle: (...args) => new JsonToggleCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/commands/json.type
				*/
				type: (...args) => new JsonTypeCommand(args, this.opts).exec(this.client)
			};
		}
		get functions() {
			return {
				/**
				* @see https://redis.io/docs/latest/commands/function-load/
				*/
				load: (...args) => new FunctionLoadCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/docs/latest/commands/function-list/
				*/
				list: (...args) => new FunctionListCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/docs/latest/commands/function-delete/
				*/
				delete: (...args) => new FunctionDeleteCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/docs/latest/commands/function-flush/
				*/
				flush: () => new FunctionFlushCommand(this.opts).exec(this.client),
				/**
				* @see https://redis.io/docs/latest/commands/function-stats/
				*
				* Note: `running_script` field is not supported and therefore not included in the type.
				*/
				stats: () => new FunctionStatsCommand(this.opts).exec(this.client),
				/**
				* @see https://redis.io/docs/latest/commands/fcall/
				*/
				call: (...args) => new FCallCommand(args, this.opts).exec(this.client),
				/**
				* @see https://redis.io/docs/latest/commands/fcall_ro/
				*/
				callRo: (...args) => new FCallRoCommand(args, this.opts).exec(this.client)
			};
		}
		/**
		* Wrap a new middleware around the HTTP client.
		*/
		use = (middleware) => {
			const makeRequest = this.client.request.bind(this.client);
			this.client.request = (req) => middleware(req, makeRequest);
		};
		/**
		* Technically this is not private, we can hide it from intellisense by doing this
		*/
		addTelemetry = (telemetry) => {
			if (!this.enableTelemetry) return;
			try {
				this.client.mergeTelemetry(telemetry);
			} catch {}
		};
		/**
		* Creates a new script.
		*
		* Scripts offer the ability to optimistically try to execute a script without having to send the
		* entire script to the server. If the script is loaded on the server, it tries again by sending
		* the entire script. Afterwards, the script is cached on the server.
		*
		* @param script - The script to create
		* @param opts - Optional options to pass to the script `{ readonly?: boolean }`
		* @returns A new script
		*
		* @example
		* ```ts
		* const redis = new Redis({...})
		*
		* const script = redis.createScript<string>("return ARGV[1];")
		* const arg1 = await script.eval([], ["Hello World"])
		* expect(arg1, "Hello World")
		* ```
		* @example
		* ```ts
		* const redis = new Redis({...})
		*
		* const script = redis.createScript<string>("return ARGV[1];", { readonly: true })
		* const arg1 = await script.evalRo([], ["Hello World"])
		* expect(arg1, "Hello World")
		* ```
		*/
		createScript(script, opts) {
			return opts?.readonly ? new ScriptRO(this, script) : new Script(this, script);
		}
		get search() {
			return {
				createIndex: (params) => {
					return createIndex(this.client, params);
				},
				index: (params) => {
					return initIndex(this.client, params);
				},
				alias: {
					list: () => {
						return listAliases(this.client);
					},
					add: ({ indexName, alias }) => {
						return addAlias(this.client, {
							indexName,
							alias
						});
					},
					delete: ({ alias }) => {
						return delAlias(this.client, { alias });
					}
				}
			};
		}
		/**
		* Create a new pipeline that allows you to send requests in bulk.
		*
		* @see {@link Pipeline}
		*/
		pipeline = () => new Pipeline({
			client: this.client,
			commandOptions: this.opts,
			multiExec: false
		});
		autoPipeline = () => {
			return createAutoPipelineProxy(this);
		};
		/**
		* Create a new transaction to allow executing multiple steps atomically.
		*
		* All the commands in a transaction are serialized and executed sequentially. A request sent by
		* another client will never be served in the middle of the execution of a Redis Transaction. This
		* guarantees that the commands are executed as a single isolated operation.
		*
		* @see {@link Pipeline}
		*/
		multi = () => new Pipeline({
			client: this.client,
			commandOptions: this.opts,
			multiExec: true
		});
		/**
		* Returns an instance that can be used to execute `BITFIELD` commands on one key.
		*
		* @example
		* ```typescript
		* redis.set("mykey", 0);
		* const result = await redis.bitfield("mykey")
		*   .set("u4", 0, 16)
		*   .incr("u4", "#1", 1)
		*   .exec();
		* console.log(result); // [0, 1]
		* ```
		*
		* @see https://redis.io/commands/bitfield
		*/
		bitfield = (...args) => new BitFieldCommand(args, this.client, this.opts);
		/**
		* @see https://redis.io/commands/append
		*/
		append = (...args) => new AppendCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/bitcount
		*/
		bitcount = (...args) => new BitCountCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/bitop
		*/
		bitop = (op, destinationKey, sourceKey, ...sourceKeys) => new BitOpCommand([
			op,
			destinationKey,
			sourceKey,
			...sourceKeys
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/bitpos
		*/
		bitpos = (...args) => new BitPosCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/client-setinfo
		*/
		clientSetinfo = (...args) => new ClientSetInfoCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/copy
		*/
		copy = (...args) => new CopyCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/dbsize
		*/
		dbsize = () => new DBSizeCommand(this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/decr
		*/
		decr = (...args) => new DecrCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/decrby
		*/
		decrby = (...args) => new DecrByCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/del
		*/
		del = (...args) => new DelCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/echo
		*/
		echo = (...args) => new EchoCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/eval_ro
		*/
		evalRo = (...args) => new EvalROCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/eval
		*/
		eval = (...args) => new EvalCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/evalsha_ro
		*/
		evalshaRo = (...args) => new EvalshaROCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/evalsha
		*/
		evalsha = (...args) => new EvalshaCommand(args, this.opts).exec(this.client);
		/**
		* Generic method to execute any Redis command.
		*/
		exec = (args) => new ExecCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/exists
		*/
		exists = (...args) => new ExistsCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/expire
		*/
		expire = (...args) => new ExpireCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/expireat
		*/
		expireat = (...args) => new ExpireAtCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/flushall
		*/
		flushall = (args) => new FlushAllCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/flushdb
		*/
		flushdb = (...args) => new FlushDBCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/geoadd
		*/
		geoadd = (...args) => new GeoAddCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/geopos
		*/
		geopos = (...args) => new GeoPosCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/geodist
		*/
		geodist = (...args) => new GeoDistCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/geohash
		*/
		geohash = (...args) => new GeoHashCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/geosearch
		*/
		geosearch = (...args) => new GeoSearchCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/geosearchstore
		*/
		geosearchstore = (...args) => new GeoSearchStoreCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/get
		*/
		get = (...args) => new GetCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/getbit
		*/
		getbit = (...args) => new GetBitCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/getdel
		*/
		getdel = (...args) => new GetDelCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/getex
		*/
		getex = (...args) => new GetExCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/getrange
		*/
		getrange = (...args) => new GetRangeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/getset
		*/
		getset = (key, value) => new GetSetCommand([key, value], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hdel
		*/
		hdel = (...args) => new HDelCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hexists
		*/
		hexists = (...args) => new HExistsCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hexpire
		*/
		hexpire = (...args) => new HExpireCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hexpireat
		*/
		hexpireat = (...args) => new HExpireAtCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hexpiretime
		*/
		hexpiretime = (...args) => new HExpireTimeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/httl
		*/
		httl = (...args) => new HTtlCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hpexpire
		*/
		hpexpire = (...args) => new HPExpireCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hpexpireat
		*/
		hpexpireat = (...args) => new HPExpireAtCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hpexpiretime
		*/
		hpexpiretime = (...args) => new HPExpireTimeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hpttl
		*/
		hpttl = (...args) => new HPTtlCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hpersist
		*/
		hpersist = (...args) => new HPersistCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hget
		*/
		hget = (...args) => new HGetCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hgetall
		*/
		hgetall = (...args) => new HGetAllCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hgetdel
		*/
		hgetdel = (...args) => new HGetDelCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hgetex
		*/
		hgetex = (...args) => new HGetExCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hincrby
		*/
		hincrby = (...args) => new HIncrByCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hincrbyfloat
		*/
		hincrbyfloat = (...args) => new HIncrByFloatCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hkeys
		*/
		hkeys = (...args) => new HKeysCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hlen
		*/
		hlen = (...args) => new HLenCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hmget
		*/
		hmget = (...args) => new HMGetCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hmset
		*/
		hmset = (key, kv) => new HMSetCommand([key, kv], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hrandfield
		*/
		hrandfield = (key, count, withValues) => new HRandFieldCommand([
			key,
			count,
			withValues
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hscan
		*/
		hscan = (...args) => new HScanCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hset
		*/
		hset = (key, kv) => new HSetCommand([key, kv], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hsetex
		*/
		hsetex = (...args) => new HSetExCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hsetnx
		*/
		hsetnx = (key, field, value) => new HSetNXCommand([
			key,
			field,
			value
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hstrlen
		*/
		hstrlen = (...args) => new HStrLenCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/hvals
		*/
		hvals = (...args) => new HValsCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/incr
		*/
		incr = (...args) => new IncrCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/incrby
		*/
		incrby = (...args) => new IncrByCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/incrbyfloat
		*/
		incrbyfloat = (...args) => new IncrByFloatCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/keys
		*/
		keys = (...args) => new KeysCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lindex
		*/
		lindex = (...args) => new LIndexCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/linsert
		*/
		linsert = (key, direction, pivot, value) => new LInsertCommand([
			key,
			direction,
			pivot,
			value
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/llen
		*/
		llen = (...args) => new LLenCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lmove
		*/
		lmove = (...args) => new LMoveCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lpop
		*/
		lpop = (...args) => new LPopCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lmpop
		*/
		lmpop = (...args) => new LmPopCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lpos
		*/
		lpos = (...args) => new LPosCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lpush
		*/
		lpush = (key, ...elements) => new LPushCommand([key, ...elements], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lpushx
		*/
		lpushx = (key, ...elements) => new LPushXCommand([key, ...elements], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lrange
		*/
		lrange = (...args) => new LRangeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lrem
		*/
		lrem = (key, count, value) => new LRemCommand([
			key,
			count,
			value
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/lset
		*/
		lset = (key, index, value) => new LSetCommand([
			key,
			index,
			value
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/ltrim
		*/
		ltrim = (...args) => new LTrimCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/mget
		*/
		mget = (...args) => new MGetCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/mset
		*/
		mset = (kv) => new MSetCommand([kv], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/msetnx
		*/
		msetnx = (kv) => new MSetNXCommand([kv], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/persist
		*/
		persist = (...args) => new PersistCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/pexpire
		*/
		pexpire = (...args) => new PExpireCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/pexpireat
		*/
		pexpireat = (...args) => new PExpireAtCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/pfadd
		*/
		pfadd = (...args) => new PfAddCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/pfcount
		*/
		pfcount = (...args) => new PfCountCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/pfmerge
		*/
		pfmerge = (...args) => new PfMergeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/ping
		*/
		ping = (args) => new PingCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/psetex
		*/
		psetex = (key, ttl, value) => new PSetEXCommand([
			key,
			ttl,
			value
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/psubscribe
		*/
		psubscribe = (patterns) => {
			const patternArray = Array.isArray(patterns) ? patterns : [patterns];
			return new Subscriber(this.client, patternArray, true, this.opts);
		};
		/**
		* @see https://redis.io/commands/pttl
		*/
		pttl = (...args) => new PTtlCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/publish
		*/
		publish = (...args) => new PublishCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/randomkey
		*/
		randomkey = () => new RandomKeyCommand().exec(this.client);
		/**
		* @see https://redis.io/commands/rename
		*/
		rename = (...args) => new RenameCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/renamenx
		*/
		renamenx = (...args) => new RenameNXCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/rpop
		*/
		rpop = (...args) => new RPopCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/rpush
		*/
		rpush = (key, ...elements) => new RPushCommand([key, ...elements], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/rpushx
		*/
		rpushx = (key, ...elements) => new RPushXCommand([key, ...elements], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sadd
		*/
		sadd = (key, member, ...members) => new SAddCommand([
			key,
			member,
			...members
		], this.opts).exec(this.client);
		scan(cursor, opts) {
			return new ScanCommand([cursor, opts], this.opts).exec(this.client);
		}
		/**
		* @see https://redis.io/commands/scard
		*/
		scard = (...args) => new SCardCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/script-exists
		*/
		scriptExists = (...args) => new ScriptExistsCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/script-flush
		*/
		scriptFlush = (...args) => new ScriptFlushCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/script-load
		*/
		scriptLoad = (...args) => new ScriptLoadCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sdiff
		*/
		sdiff = (...args) => new SDiffCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sdiffstore
		*/
		sdiffstore = (...args) => new SDiffStoreCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/set
		*/
		set = (key, value, opts) => new SetCommand([
			key,
			value,
			opts
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/setbit
		*/
		setbit = (...args) => new SetBitCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/setex
		*/
		setex = (key, ttl, value) => new SetExCommand([
			key,
			ttl,
			value
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/setnx
		*/
		setnx = (key, value) => new SetNxCommand([key, value], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/setrange
		*/
		setrange = (...args) => new SetRangeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sinter
		*/
		sinter = (...args) => new SInterCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sintercard
		*/
		sintercard = (...args) => new SInterCardCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sinterstore
		*/
		sinterstore = (...args) => new SInterStoreCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sismember
		*/
		sismember = (key, member) => new SIsMemberCommand([key, member], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/smismember
		*/
		smismember = (key, members) => new SMIsMemberCommand([key, members], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/smembers
		*/
		smembers = (...args) => new SMembersCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/smove
		*/
		smove = (source, destination, member) => new SMoveCommand([
			source,
			destination,
			member
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/spop
		*/
		spop = (...args) => new SPopCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/srandmember
		*/
		srandmember = (...args) => new SRandMemberCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/srem
		*/
		srem = (key, ...members) => new SRemCommand([key, ...members], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sscan
		*/
		sscan = (...args) => new SScanCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/strlen
		*/
		strlen = (...args) => new StrLenCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/subscribe
		*/
		subscribe = (channels) => {
			const channelArray = Array.isArray(channels) ? channels : [channels];
			return new Subscriber(this.client, channelArray, false, this.opts);
		};
		/**
		* @see https://redis.io/commands/sunion
		*/
		sunion = (...args) => new SUnionCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/sunionstore
		*/
		sunionstore = (...args) => new SUnionStoreCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/time
		*/
		time = () => new TimeCommand().exec(this.client);
		/**
		* @see https://redis.io/commands/touch
		*/
		touch = (...args) => new TouchCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/ttl
		*/
		ttl = (...args) => new TtlCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/type
		*/
		type = (...args) => new TypeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/unlink
		*/
		unlink = (...args) => new UnlinkCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xadd
		*/
		xadd = (...args) => new XAddCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xack
		*/
		xack = (...args) => new XAckCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xackdel
		*/
		xackdel = (...args) => new XAckDelCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xdel
		*/
		xdel = (...args) => new XDelCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xdelex
		*/
		xdelex = (...args) => new XDelExCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xgroup
		*/
		xgroup = (...args) => new XGroupCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xread
		*/
		xread = (...args) => new XReadCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xreadgroup
		*/
		xreadgroup = (...args) => new XReadGroupCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xinfo
		*/
		xinfo = (...args) => new XInfoCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xlen
		*/
		xlen = (...args) => new XLenCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xpending
		*/
		xpending = (...args) => new XPendingCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xclaim
		*/
		xclaim = (...args) => new XClaimCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xautoclaim
		*/
		xautoclaim = (...args) => new XAutoClaim(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xtrim
		*/
		xtrim = (...args) => new XTrimCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xrange
		*/
		xrange = (...args) => new XRangeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/xrevrange
		*/
		xrevrange = (...args) => new XRevRangeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zadd
		*/
		zadd = (...args) => {
			if ("score" in args[1]) return new ZAddCommand([
				args[0],
				args[1],
				...args.slice(2)
			], this.opts).exec(this.client);
			return new ZAddCommand([
				args[0],
				args[1],
				...args.slice(2)
			], this.opts).exec(this.client);
		};
		/**
		* @see https://redis.io/commands/zcard
		*/
		zcard = (...args) => new ZCardCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zcount
		*/
		zcount = (...args) => new ZCountCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zdiffstore
		*/
		zdiffstore = (...args) => new ZDiffStoreCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zincrby
		*/
		zincrby = (key, increment, member) => new ZIncrByCommand([
			key,
			increment,
			member
		], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zinterstore
		*/
		zinterstore = (...args) => new ZInterStoreCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zlexcount
		*/
		zlexcount = (...args) => new ZLexCountCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zmscore
		*/
		zmscore = (...args) => new ZMScoreCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zpopmax
		*/
		zpopmax = (...args) => new ZPopMaxCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zpopmin
		*/
		zpopmin = (...args) => new ZPopMinCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zrange
		*/
		zrange = (...args) => new ZRangeCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zrank
		*/
		zrank = (key, member) => new ZRankCommand([key, member], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zrem
		*/
		zrem = (key, ...members) => new ZRemCommand([key, ...members], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zremrangebylex
		*/
		zremrangebylex = (...args) => new ZRemRangeByLexCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zremrangebyrank
		*/
		zremrangebyrank = (...args) => new ZRemRangeByRankCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zremrangebyscore
		*/
		zremrangebyscore = (...args) => new ZRemRangeByScoreCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zrevrank
		*/
		zrevrank = (key, member) => new ZRevRankCommand([key, member], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zscan
		*/
		zscan = (...args) => new ZScanCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zscore
		*/
		zscore = (key, member) => new ZScoreCommand([key, member], this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zunion
		*/
		zunion = (...args) => new ZUnionCommand(args, this.opts).exec(this.client);
		/**
		* @see https://redis.io/commands/zunionstore
		*/
		zunionstore = (...args) => new ZUnionStoreCommand(args, this.opts).exec(this.client);
	};
	VERSION = "v1.38.4";
}));
// node_modules/@upstash/redis/nodejs.mjs
var nodejs_exports = /* @__PURE__ */ __exportAll({
	Redis: () => Redis2,
	SearchIndex: () => SearchIndex,
	errors: () => error_exports,
	s: () => s
});
var BUILD, TextFieldBuilder, NumericFieldBuilder, BoolFieldBuilder, DateFieldBuilder, KeywordFieldBuilder, FacetFieldBuilder, s, Redis2;
var init_nodejs = __esmMin((() => {
	init_chunk_2JFYL2VL();
	BUILD = /* @__PURE__ */ Symbol("build");
	TextFieldBuilder = class _TextFieldBuilder {
		_noTokenize;
		_noStem;
		_from;
		constructor(noTokenize = { noTokenize: false }, noStem = { noStem: false }, from = { from: null }) {
			this._noTokenize = noTokenize;
			this._noStem = noStem;
			this._from = from;
		}
		noTokenize() {
			return new _TextFieldBuilder({ noTokenize: true }, this._noStem, this._from);
		}
		noStem() {
			return new _TextFieldBuilder(this._noTokenize, { noStem: true }, this._from);
		}
		from(field) {
			return new _TextFieldBuilder(this._noTokenize, this._noStem, { from: field });
		}
		[BUILD]() {
			return {
				type: "TEXT",
				...this._noTokenize.noTokenize ? { noTokenize: true } : {},
				...this._noStem.noStem ? { noStem: true } : {},
				...this._from.from ? { from: this._from.from } : {}
			};
		}
	};
	NumericFieldBuilder = class _NumericFieldBuilder {
		type;
		_from;
		constructor(type, from = { from: null }) {
			this.type = type;
			this._from = from;
		}
		from(field) {
			return new _NumericFieldBuilder(this.type, { from: field });
		}
		[BUILD]() {
			return this._from.from ? {
				type: this.type,
				fast: true,
				from: this._from.from
			} : {
				type: this.type,
				fast: true
			};
		}
	};
	BoolFieldBuilder = class _BoolFieldBuilder {
		_fast;
		_from;
		constructor(fast = { fast: false }, from = { from: null }) {
			this._fast = fast;
			this._from = from;
		}
		fast() {
			return new _BoolFieldBuilder({ fast: true }, this._from);
		}
		from(field) {
			return new _BoolFieldBuilder(this._fast, { from: field });
		}
		[BUILD]() {
			const hasFast = this._fast.fast;
			const hasFrom = Boolean(this._from.from);
			if (hasFast && hasFrom) return {
				type: "BOOL",
				fast: true,
				from: this._from.from
			};
			if (hasFast) return {
				type: "BOOL",
				fast: true
			};
			if (hasFrom) return {
				type: "BOOL",
				from: this._from.from
			};
			return { type: "BOOL" };
		}
	};
	DateFieldBuilder = class _DateFieldBuilder {
		_fast;
		_from;
		constructor(fast = { fast: false }, from = { from: null }) {
			this._fast = fast;
			this._from = from;
		}
		fast() {
			return new _DateFieldBuilder({ fast: true }, this._from);
		}
		from(field) {
			return new _DateFieldBuilder(this._fast, { from: field });
		}
		[BUILD]() {
			const hasFast = this._fast.fast;
			const hasFrom = Boolean(this._from.from);
			if (hasFast && hasFrom) return {
				type: "DATE",
				fast: true,
				from: this._from.from
			};
			if (hasFast) return {
				type: "DATE",
				fast: true
			};
			if (hasFrom) return {
				type: "DATE",
				from: this._from.from
			};
			return { type: "DATE" };
		}
	};
	KeywordFieldBuilder = class {
		[BUILD]() {
			return { type: "KEYWORD" };
		}
	};
	FacetFieldBuilder = class {
		[BUILD]() {
			return { type: "FACET" };
		}
	};
	s = {
		string() {
			return new TextFieldBuilder();
		},
		number(type = "F64") {
			return new NumericFieldBuilder(type);
		},
		boolean() {
			return new BoolFieldBuilder();
		},
		date() {
			return new DateFieldBuilder();
		},
		keyword() {
			return new KeywordFieldBuilder();
		},
		facet() {
			return new FacetFieldBuilder();
		},
		object(fields) {
			const result = {};
			for (const [key, value] of Object.entries(fields)) if (value && typeof value === "object" && BUILD in value) result[key] = value[BUILD]();
			else result[key] = value;
			return result;
		}
	};
	if (typeof atob === "undefined") global.atob = (b64) => Buffer.from(b64, "base64").toString("utf8");
	Redis2 = class _Redis extends Redis {
		/**
		* Create a new redis client by providing a custom `Requester` implementation
		*
		* @example
		* ```ts
		*
		* import { UpstashRequest, Requester, UpstashResponse, Redis } from "@upstash/redis"
		*
		*  const requester: Requester = {
		*    request: <TResult>(req: UpstashRequest): Promise<UpstashResponse<TResult>> => {
		*      // ...
		*    }
		*  }
		*
		* const redis = new Redis(requester)
		* ```
		*/
		constructor(configOrRequester) {
			if ("request" in configOrRequester) {
				super(configOrRequester);
				return;
			}
			if (!configOrRequester.url) console.warn(`[Upstash Redis] The 'url' property is missing or undefined in your Redis config. To create a database instantly (no signup needed), run: curl -X POST https://upstash.com/start-redis`);
			else if (configOrRequester.url.startsWith(" ") || configOrRequester.url.endsWith(" ") || /\r|\n/.test(configOrRequester.url)) console.warn("[Upstash Redis] The redis url contains whitespace or newline, which can cause errors!");
			if (!configOrRequester.token) console.warn(`[Upstash Redis] The 'token' property is missing or undefined in your Redis config. To create a database instantly (no signup needed), run: curl -X POST https://upstash.com/start-redis`);
			else if (configOrRequester.token.startsWith(" ") || configOrRequester.token.endsWith(" ") || /\r|\n/.test(configOrRequester.token)) console.warn("[Upstash Redis] The redis token contains whitespace or newline, which can cause errors!");
			const client = new HttpClient({
				baseUrl: configOrRequester.url,
				retry: configOrRequester.retry,
				headers: { authorization: `Bearer ${configOrRequester.token}` },
				agent: configOrRequester.agent,
				responseEncoding: configOrRequester.responseEncoding,
				cache: configOrRequester.cache ?? "no-store",
				signal: configOrRequester.signal,
				keepAlive: configOrRequester.keepAlive,
				readYourWrites: configOrRequester.readYourWrites
			});
			const safeEnv = typeof process === "object" && process && typeof process.env === "object" && process.env ? process.env : {};
			super(client, {
				automaticDeserialization: configOrRequester.automaticDeserialization,
				enableTelemetry: configOrRequester.enableTelemetry ?? !safeEnv.UPSTASH_DISABLE_TELEMETRY,
				latencyLogging: configOrRequester.latencyLogging,
				enableAutoPipelining: configOrRequester.enableAutoPipelining
			});
			const nodeVersion = typeof process === "object" && process ? process.version : void 0;
			this.addTelemetry({
				runtime: typeof EdgeRuntime === "string" ? "edge-light" : nodeVersion ? `node@${nodeVersion}` : "unknown",
				platform: safeEnv.UPSTASH_CONSOLE ? "console" : safeEnv.VERCEL ? "vercel" : safeEnv.AWS_REGION ? "aws" : "unknown",
				sdk: `@upstash/redis@${VERSION}`
			});
			if (this.enableAutoPipelining) return this.autoPipeline();
		}
		/**
		* Create a new Upstash Redis instance from environment variables.
		*
		* Use this to automatically load connection secrets from your environment
		* variables. For instance when using the Vercel integration.
		*
		* This tries to load connection details from your environment using `process.env`:
		* - URL: `UPSTASH_REDIS_REST_URL` or fallback to `KV_REST_API_URL`
		* - Token: `UPSTASH_REDIS_REST_TOKEN` or fallback to `KV_REST_API_TOKEN`
		*
		* The fallback variables provide compatibility with Vercel KV and other platforms
		* that may use different naming conventions.
		*/
		static fromEnv(config) {
			if (typeof process !== "object" || !process || typeof process.env !== "object" || !process.env) throw new TypeError("[Upstash Redis] Unable to get environment variables, `process.env` is undefined. If you are deploying to cloudflare, please import from \"@upstash/redis/cloudflare\" instead");
			const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
			if (!url) console.warn("[Upstash Redis] Unable to find environment variable: `UPSTASH_REDIS_REST_URL`. To create a database instantly (no signup needed), run: curl -X POST https://upstash.com/start-redis");
			const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
			if (!token) console.warn("[Upstash Redis] Unable to find environment variable: `UPSTASH_REDIS_REST_TOKEN`. To create a database instantly (no signup needed), run: curl -X POST https://upstash.com/start-redis");
			return new _Redis({
				...config,
				url,
				token
			});
		}
	};
}));
// api/_lib/store.js
let redis$1 = null;
try {
	const { Redis } = await Promise.resolve().then(() => (init_nodejs(), nodejs_exports));
	if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) redis$1 = Redis.fromEnv();
} catch {
	redis$1 = null;
}
const mem$1 = /* @__PURE__ */ new Map();
const TTL = 259200;
const SOLO_TTL = 15552e3;
const hasKv = () => !!redis$1;
async function getRoom(id) {
	if (redis$1) return await redis$1.get(`room:${id}`) || null;
	return mem$1.get(`room:${id}`) || null;
}
async function setRoom(id, room) {
	if (redis$1) return redis$1.set(`room:${id}`, room, { ex: TTL });
	mem$1.set(`room:${id}`, room);
	return true;
}
async function withRoom(id, fn) {
	const room = await getRoom(id);
	if (!room) return {
		error: "Комната не найдена",
		status: 404
	};
	const next = await fn(room);
	if (next && next.error) return next;
	await setRoom(id, next || room);
	return { room: next || room };
}
const PUBLIC_ROOMS_KEY = "public_rooms";
async function addPublicRoom(id) {
	if (redis$1) return redis$1.sadd(PUBLIC_ROOMS_KEY, id);
	if (!mem$1.has(PUBLIC_ROOMS_KEY)) mem$1.set(PUBLIC_ROOMS_KEY, /* @__PURE__ */ new Set());
	mem$1.get(PUBLIC_ROOMS_KEY).add(id);
	return true;
}
async function removePublicRoom(id) {
	if (redis$1) return redis$1.srem(PUBLIC_ROOMS_KEY, id);
	if (mem$1.has(PUBLIC_ROOMS_KEY)) mem$1.get(PUBLIC_ROOMS_KEY).delete(id);
	return true;
}
async function listPublicRoomIds() {
	return (redis$1 ? await redis$1.smembers(PUBLIC_ROOMS_KEY) : mem$1.has(PUBLIC_ROOMS_KEY) ? [...mem$1.get(PUBLIC_ROOMS_KEY)] : []) || [];
}
const LINK_TTL = 600;
async function getLink(code) {
	const raw = redis$1 ? await redis$1.get(`link:${code}`) : mem$1.get(`link:${code}`);
	if (!raw) return null;
	if (raw.expiresAt && Date.now() > raw.expiresAt) {
		await delLink(code);
		return null;
	}
	return raw;
}
async function setLink(code, data, ttlSeconds = LINK_TTL) {
	const value = {
		...data,
		expiresAt: Date.now() + ttlSeconds * 1e3
	};
	if (redis$1) await redis$1.set(`link:${code}`, value, { ex: ttlSeconds });
	else mem$1.set(`link:${code}`, value);
	return value;
}
async function delLink(code) {
	if (redis$1) return redis$1.del(`link:${code}`);
	mem$1.delete(`link:${code}`);
	return true;
}
async function getProfile(playerId) {
	if (redis$1) return await redis$1.get(`profile:${playerId}`) || null;
	return mem$1.get(`profile:${playerId}`) || null;
}
async function setProfile(playerId, profile) {
	if (redis$1) return redis$1.set(`profile:${playerId}`, profile, { ex: SOLO_TTL });
	mem$1.set(`profile:${playerId}`, profile);
	return true;
}
async function getSoloSlots(playerId) {
	if (redis$1) return await redis$1.get(`solo:${playerId}`) || null;
	return mem$1.get(`solo:${playerId}`) || null;
}
async function setSoloSlots(playerId, slots) {
	if (redis$1) return redis$1.set(`solo:${playerId}`, slots, { ex: SOLO_TTL });
	mem$1.set(`solo:${playerId}`, slots);
	return true;
}
const DAILY_TTL = 2678400;
async function getDailyBoard(day) {
	if (redis$1) return await redis$1.hgetall(`daily:${day}`) || {};
	return { ...mem$1.get(`daily:${day}`) };
}
async function setDailyEntry(day, playerId, entry) {
	if (redis$1) {
		await redis$1.hset(`daily:${day}`, { [playerId]: entry });
		await redis$1.expire(`daily:${day}`, DAILY_TTL);
		return true;
	}
	mem$1.set(`daily:${day}`, {
		...mem$1.get(`daily:${day}`),
		[playerId]: entry
	});
	return true;
}
async function getTycoonSlots(playerId) {
	if (redis$1) return await redis$1.get(`tycoon:${playerId}`) || null;
	return mem$1.get(`tycoon:${playerId}`) || null;
}
async function setTycoonSlots(playerId, slots) {
	if (redis$1) return redis$1.set(`tycoon:${playerId}`, slots, { ex: SOLO_TTL });
	mem$1.set(`tycoon:${playerId}`, slots);
	return true;
}
async function getUser(login) {
	if (redis$1) return await redis$1.get(`user:${login}`) || null;
	return mem$1.get(`user:${login}`) || null;
}
async function setUser(login, user) {
	if (redis$1) return redis$1.set(`user:${login}`, user);
	mem$1.set(`user:${login}`, user);
	return true;
}
async function getSession(token) {
	if (redis$1) return await redis$1.get(`session:${token}`) || null;
	return mem$1.get(`session:${token}`) || null;
}
async function setSession(token, login) {
	if (redis$1) return redis$1.set(`session:${token}`, login, { ex: SOLO_TTL });
	mem$1.set(`session:${token}`, login);
	return true;
}
async function delSession(token) {
	if (redis$1) return redis$1.del(`session:${token}`);
	mem$1.delete(`session:${token}`);
	return true;
}
async function getUsers(logins) {
	if (!logins.length) return {};
	const vals = redis$1 ? await redis$1.mget(...logins.map((l) => `user:${l}`)) : logins.map((l) => mem$1.get(`user:${l}`) || null);
	return Object.fromEntries(logins.map((l, i) => [l, vals[i] || null]));
}
async function getCards(logins) {
	if (!logins.length) return {};
	const vals = redis$1 ? await redis$1.mget(...logins.map((l) => `card:${l}`)) : logins.map((l) => mem$1.get(`card:${l}`) || null);
	return Object.fromEntries(logins.map((l, i) => [l, vals[i] || null]));
}
async function setCard(login, card) {
	if (redis$1) return redis$1.set(`card:${login}`, card, { ex: SOLO_TTL });
	mem$1.set(`card:${login}`, card);
	return true;
}
const RACE_TTL = 2678400;
async function getRaces(ids) {
	if (!ids.length) return [];
	return (redis$1 ? await redis$1.mget(...ids.map((id) => `race:${id}`)) : ids.map((id) => mem$1.get(`race:${id}`) || null)).filter(Boolean);
}
async function setRace(race) {
	if (redis$1) return redis$1.set(`race:${race.id}`, race, { ex: RACE_TTL });
	mem$1.set(`race:${race.id}`, race);
	return true;
}
async function hit(key, ttlSeconds) {
	if (redis$1) {
		const n = await redis$1.incr(`hit:${key}`);
		if (n === 1) await redis$1.expire(`hit:${key}`, ttlSeconds);
		return n;
	}
	const now = Date.now();
	const cur = mem$1.get(`hit:${key}`);
	const next = cur && cur.until > now ? {
		n: cur.n + 1,
		until: cur.until
	} : {
		n: 1,
		until: now + ttlSeconds * 1e3
	};
	mem$1.set(`hit:${key}`, next);
	return next.n;
}
async function getRecords(kind) {
	if (redis$1) return await redis$1.hgetall(`records:${kind}`) || {};
	return { ...mem$1.get(`records:${kind}`) };
}
async function setRecord(kind, key, entry) {
	if (redis$1) {
		await redis$1.hset(`records:${kind}`, { [key]: entry });
		return true;
	}
	mem$1.set(`records:${kind}`, {
		...mem$1.get(`records:${kind}`),
		[key]: entry
	});
	return true;
}
const REPORTS_MAX = 2e3;
async function getReports() {
	const raw = redis$1 ? await redis$1.hgetall("reports") || {} : { ...mem$1.get("reports") };
	return Object.values(raw).map((v) => typeof v === "string" ? JSON.parse(v) : v);
}
async function deleteReport(id) {
	if (redis$1) await redis$1.hdel("reports", id);
	else {
		const m = { ...mem$1.get("reports") };
		delete m[id];
		mem$1.set("reports", m);
	}
	return true;
}
async function setReports(entries) {
	if (!entries.length) return true;
	if (redis$1) await redis$1.hset("reports", Object.fromEntries(entries.map((e) => [e.id, e])));
	else mem$1.set("reports", {
		...mem$1.get("reports"),
		...Object.fromEntries(entries.map((e) => [e.id, e]))
	});
	return true;
}
async function deleteReports(ids) {
	if (!ids.length) return true;
	if (redis$1) await redis$1.hdel("reports", ...ids);
	else {
		const m = { ...mem$1.get("reports") };
		ids.forEach((id) => delete m[id]);
		mem$1.set("reports", m);
	}
	return true;
}
async function setReport(entry) {
	if (redis$1) await redis$1.hset("reports", { [entry.id]: entry });
	else mem$1.set("reports", {
		...mem$1.get("reports"),
		[entry.id]: entry
	});
	const all = await getReports();
	if (all.length > REPORTS_MAX) {
		const old = all.sort((a, b) => a.at - b.at).slice(0, all.length - REPORTS_MAX).map((r) => r.id);
		if (redis$1) await redis$1.hdel("reports", ...old);
		else {
			const m = { ...mem$1.get("reports") };
			old.forEach((id) => delete m[id]);
			mem$1.set("reports", m);
		}
	}
	return true;
}
let leagueNamesDropped = false;
async function dropLeagueNames() {
	if (leagueNamesDropped) return true;
	if (redis$1) await redis$1.del("league-names");
	else mem$1.delete("league-names");
	leagueNamesDropped = true;
	return true;
}
const lastDays$1 = (n) => Array.from({ length: n }, (_, k) => (/* @__PURE__ */ new Date(Date.now() - k * 864e5)).toISOString().slice(0, 10));
async function deleteUserData({ login, playerId }) {
	const keys = [
		`user:${login}`,
		`card:${login}`,
		...playerId ? [
			`profile:${playerId}`,
			`solo:${playerId}`,
			`tycoon:${playerId}`
		] : []
	];
	if (redis$1) {
		await redis$1.del(...keys);
		await redis$1.hdel("records:tycoon", login);
		if (playerId) for (const day of lastDays$1(32)) await redis$1.hdel(`daily:${day}`, playerId);
	} else {
		keys.forEach((k) => mem$1.delete(k));
		const rec = { ...mem$1.get("records:tycoon") };
		delete rec[login];
		mem$1.set("records:tycoon", rec);
		if (playerId) lastDays$1(32).forEach((day) => {
			const b = { ...mem$1.get(`daily:${day}`) };
			delete b[playerId];
			mem$1.set(`daily:${day}`, b);
		});
	}
	const mine = (await getReports()).filter((r) => r.login === login).map((r) => r.id);
	for (const id of mine) await deleteReport(id);
	return true;
}
const COUNTER_TTL = 10368e3;
async function bumpCounters(keys, ttlSeconds = COUNTER_TTL) {
	if (redis$1) {
		for (const k of keys) if (await redis$1.incr(`cnt:${k}`) === 1 && ttlSeconds) await redis$1.expire(`cnt:${k}`, ttlSeconds);
		return true;
	}
	keys.forEach((k) => mem$1.set(`cnt:${k}`, (mem$1.get(`cnt:${k}`) || 0) + 1));
	return true;
}
async function addCounters(pairs, ttlSeconds = COUNTER_TTL) {
	if (redis$1) {
		for (const [k, n] of pairs) if (await redis$1.incrby(`cnt:${k}`, n) === n && ttlSeconds) await redis$1.expire(`cnt:${k}`, ttlSeconds);
		return true;
	}
	pairs.forEach(([k, n]) => mem$1.set(`cnt:${k}`, (mem$1.get(`cnt:${k}`) || 0) + n));
	return true;
}
async function readCounters(keys) {
	if (!keys.length) return {};
	if (redis$1) {
		const vals = await redis$1.mget(...keys.map((k) => `cnt:${k}`));
		return Object.fromEntries(keys.map((k, i) => [k, Number(vals[i]) || 0]));
	}
	return Object.fromEntries(keys.map((k) => [k, mem$1.get(`cnt:${k}`) || 0]));
}
async function addToSet(name, member) {
	if (redis$1) return redis$1.sadd(`set:${name}`, member);
	const s = mem$1.get(`set:${name}`) || /* @__PURE__ */ new Set();
	s.add(member);
	mem$1.set(`set:${name}`, s);
	return true;
}
async function setMembers(name) {
	if (redis$1) return await redis$1.smembers(`set:${name}`) || [];
	return [...mem$1.get(`set:${name}`) || []];
}
// api/_lib/friends.js
const RACE = {
	acceptMs: 864e5,
	days: 3,
	maxOpen: 3,
	keep: 20,
	friendMs: 864e5,
	restDays: 3,
	sameDays: 7
};
const SLOTS$1 = [
	"head",
	"face",
	"neck",
	"hand",
	"frame"
];
const EVENT_KINDS = /* @__PURE__ */ new Set([
	"unit",
	"streak",
	"seal",
	"month",
	"league",
	"race"
]);
const ID$1 = /^[a-z0-9-]{1,32}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const obj$1 = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const arr = (v) => Array.isArray(v) ? v : [];
const num$2 = (v, hi) => Number.isFinite(v) ? Math.max(0, Math.min(hi, Math.round(v))) : 0;
const id = (v) => typeof v === "string" && ID$1.test(v) ? v : null;
function cleanCard(raw) {
	const c = obj$1(raw);
	const w = obj$1(c.wear);
	const wear = Object.fromEntries(SLOTS$1.map((s) => [s, id(w[s])]).filter(([, v]) => v));
	const xpDays = {};
	Object.keys(obj$1(c.xpDays)).filter((d) => DAY.test(d)).sort().slice(-21).forEach((d) => {
		const x = num$2(c.xpDays[d], 5e3);
		if (x) xpDays[d] = x;
	});
	const events = arr(c.events).map(obj$1).filter((e) => EVENT_KINDS.has(e.k) && (e.id == null || id(String(e.id)))).map((e) => ({
		k: e.k,
		...e.id != null ? { id: String(e.id) } : {},
		...e.n ? { n: num$2(e.n, 1e5) } : {},
		at: num$2(e.at, 0x5af3107a4000)
	})).filter((e) => e.at > 0).sort((a, b) => b.at - a.at).slice(0, 20);
	return {
		wear,
		streak: num$2(c.streak, 5e3),
		ahead: arr(c.ahead).slice(0, 4).map((n) => num$2(n, 5e3)),
		xp: num$2(c.xp, 1e8),
		level: id(c.level),
		league: id(c.league),
		seals: [...new Set(arr(c.seals).map(id).filter(Boolean))].slice(0, 60),
		album: num$2(c.album, 200),
		months: arr(c.months).filter((m) => typeof m === "string" && /^\d{4}-\d{2}$/.test(m)).slice(-36),
		xpDays,
		events
	};
}
function raceStatus(race, now = Date.now()) {
	if (!race) return null;
	if (race.status === "pending" && now - race.at > RACE.acceptMs) return "expired";
	return race.status;
}
const raceOpen = (race, now = Date.now()) => ["pending", "active"].includes(raceStatus(race, now)) && !(race.status === "active" && race.start && now - Date.parse(`${race.start}T00:00:00Z`) > (RACE.days + 1) * 864e5);
const DAY_MS$1 = 864e5;
const raceEnd = (r) => Date.parse(`${r.start}T00:00:00Z`) + (r.days || RACE.days) * DAY_MS$1;
function raceRest(races, login, other = null, now = Date.now()) {
	const played = arr(races).filter((r) => r && r.status === "active" && validDay$1(r.start) && [r.from, r.to].includes(login));
	if (played.some((r) => now < raceEnd(r))) return {
		until: Math.max(...played.filter((r) => now < raceEnd(r)).map(raceEnd)),
		why: "busy"
	};
	const last = (list) => list.length ? Math.max(...list.map(raceEnd)) : 0;
	const same = other ? last(played.filter((r) => [r.from, r.to].includes(other))) + RACE.sameDays * DAY_MS$1 : 0;
	const any = last(played) + RACE.restDays * DAY_MS$1;
	if (same > now && same >= any) return {
		until: same,
		why: "same"
	};
	if (any > now) return {
		until: any,
		why: "rest"
	};
	return null;
}
const validDay$1 = (v) => typeof v === "string" && DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
// src/lib/moderation.js
const LOOK = {
	a: "а",
	b: "б",
	c: "с",
	e: "е",
	h: "н",
	k: "к",
	m: "м",
	o: "о",
	p: "р",
	t: "т",
	x: "х",
	y: "у",
	u: "у",
	"0": "о",
	"3": "з",
	"@": "а",
	"6": "б"
};
const LATIN_LOOK = {
	"0": "o",
	"1": "i",
	"3": "e",
	"4": "a",
	"@": "a",
	"$": "s"
};
const CY = "а-яё";
const B = `(?:^|[^${CY}a-z])`;
const E = `(?:$|[^${CY}a-z])`;
const RU_ROOTS = [
	`х[у]+[йеёияю]`,
	`п[иеё]+зд`,
	`п[ие]+з[дж]ец`,
	`${B}(?:за|от|у|вы|на|по|раз|рас|при|до|съ|въ|об|пере|под|про)?[её]б(?:[ауыилнтщ]|ать|ёт|ет)`,
	`долбо[её]б`,
	`${B}бля+(?:[дть]|${E})`,
	`пид[оа]р`,
	`пидр`,
	`педик(?!юр)`,
	`${B}мудак`,
	`мудил`,
	`г[ао]ндон`,
	`шлюх`,
	`залуп`,
	`${B}манд[аую]${E}`,
	`${B}сук[аи]${E}`,
	`дерьм`,
	`говн[оаюе]`,
	`${B}у[её]б`,
	`въ[её]б`,
	`${B}хер(?:ов|ня|н)`
];
const LA = "a-z";
const LB = `(?:^|[^${LA}])`;
const LE = `(?:$|[^${LA}])`;
const LATIN_ROOTS = [
	`p[ie]+zd`,
	`${LB}bl+y+a+(?:d|t|${LE})`,
	`${LB}xy[uiyj](?:${LE}|n)`,
	`${LB}(?:x|kh|h)u[yj]+${LE}`,
	`${LB}na(?:x|kh|h)u[yji]`,
	`${LB}(?:x|kh)uy?e(?:v|s|t|l)`,
	`${LB}(?:za|ot|vy|na|po|raz|pri|do|pere|pro|pod|u)?(?:y?e|yo|jo)b(?:at|al|an[yinu]|ut|ish|et|en|ok|lo|li|la|uch)`,
	`dolbo(?:y?e|yo)b`,
	`pid[oa]r`,
	`pidr`,
	`${LB}mudak`,
	`mudil`,
	`g[ao]nd[oa]n`,
	`shl[y]?uh`,
	`zalup`,
	`${LB}suk[ai]${LE}`,
	`${LB}govn[oa]`,
	`${LB}dermo${LE}`,
	`fuck`,
	`${LB}shit(?:${LE}|ty|s|head|hole)`,
	`${LB}bitch(?:${LE}|es|y)`,
	`${LB}cunt`,
	`asshole`,
	`motherf`,
	`${LB}nigg(?:a|er)`,
	`faggot`,
	`whore`,
	`${LB}slut(?:${LE}|ty)`
];
const RU_RE = new RegExp(RU_ROOTS.join("|"));
const LATIN_RE = new RegExp(LATIN_ROOTS.join("|"));
const squeeze = (s) => s.replace(/(.)\1{2,}/g, "$1$1");
const HAS_CY = new RegExp(`[${CY}]`);
const HAS_LA = /[a-z]/;
const glue = (s) => s.replace(new RegExp(`(?:^|\\s)((?:[a-z${CY}][\\s.*_-]){2,}[a-z${CY}])(?=\\s|$)`, "g"), (m) => ` ${m.replace(/[\s.*_-]/g, "")}`);
const words = (s) => s.split(new RegExp(`[^a-z${CY}0-9@$]+`)).filter(Boolean);
function checkWord(w) {
	if (HAS_CY.test(w)) return ["у", "и"].some((u) => {
		const ru = Array.from(w).map((ch) => ch === "u" ? u : LOOK[ch] || ch).join("");
		return RU_RE.test(` ${squeeze(ru)} `);
	});
	if (HAS_LA.test(w)) {
		const core = w.replace(/^[0-9]+|[0-9]+$/g, "");
		const la = Array.from(core).map((ch) => LATIN_LOOK[ch] || (/[0-9]/.test(ch) ? "q" : ch)).join("");
		return LATIN_RE.test(` ${squeeze(la)} `);
	}
	return false;
}
function isRude(text) {
	if (!text) return false;
	const low = String(text).toLowerCase().replace(/ё/g, "е");
	return [low, glue(low)].some((v) => words(v).some(checkWord));
}
const RUDE_MESSAGE = "Пожалуйста, переформулируйте без грубых слов — так сообщение быстрее разберут.";
const RUDE_NAME = "Выберите, пожалуйста, другое имя.";
const yearOf = (now) => new Date(now).getUTCFullYear();
const ageFromYear = (birthYear, now = Date.now()) => yearOf(now) - birthYear - 1;
const validBirthYear = (y, now = Date.now()) => Number.isInteger(y) && y >= yearOf(now) - 100 && y <= yearOf(now) - 4;
const isKid = (birthYear, now = Date.now()) => ageFromYear(birthYear, now) < 16;
const needsParent = (birthYear, now = Date.now()) => ageFromYear(birthYear, now) < 14;
function kidsModeOf(profile, now = Date.now()) {
	if (!profile || !validBirthYear(profile.birthYear, now)) return true;
	if (isKid(profile.birthYear, now)) return true;
	return profile.kidsMode === true;
}
const newPasswordOk = (p) => typeof p === "string" && p.length >= 8 && p.length <= 100;
const PASSWORD_HINT = `не короче 8 символов`;
// api/_lib/accounts.js
const LOGIN_RE = /^[a-z0-9_]{3,20}$/;
const cleanLogin = (v) => typeof v === "string" ? v.trim().toLowerCase() : "";
function hashPassword(password, salt = randomBytes(16).toString("hex")) {
	return {
		salt,
		hash: scryptSync(String(password), salt, 64).toString("hex")
	};
}
function checkPassword(password, user) {
	if (!user || !user.salt || !user.hash) return false;
	const a = Buffer.from(scryptSync(String(password), user.salt, 64).toString("hex"), "hex");
	const b = Buffer.from(user.hash, "hex");
	return a.length === b.length && timingSafeEqual(a, b);
}
const newToken = () => randomBytes(24).toString("hex");
const REC_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newRecoveryCode() {
	const bytes = randomBytes(12);
	const raw = Array.from(bytes, (b) => REC_ALPHABET[b % 31]).join("");
	return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}
const normRecoveryCode = (v) => typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
function hashRecovery(code) {
	const { salt, hash } = hashPassword(normRecoveryCode(code));
	return {
		recSalt: salt,
		recHash: hash
	};
}
function checkRecovery(code, user) {
	if (!user || !user.recSalt || !user.recHash) return false;
	return checkPassword(normRecoveryCode(code), {
		salt: user.recSalt,
		hash: user.recHash
	});
}
const sessionValue = (user) => `${user.login}:${user.epoch || 0}`;
const emptyStats = () => ({
	rooms: 0,
	quarters: 0,
	leaves: 0,
	lastRoom: null
});
const DAY_MS = 864e5;
const nameBanned = (u) => !!u && (isRude(u.name) || !!u.renameFor && u.renameFor === u.name);
const isBlocked = (u, now = Date.now()) => nameBanned(u) && !!u.renameBy && u.renameBy <= now;
const nameNextAt = (u, now = Date.now()) => !u || !u.nameAt || nameBanned(u) || u.nameAt + 2592e6 <= now ? 0 : u.nameAt + 30 * DAY_MS;
const nameForOthers = (name, login) => name && !isRude(name) ? name : login && !isRude(login) ? login : "Ученик";
async function checkName(user, now = Date.now()) {
	if (!user) return user;
	const banned = nameBanned(user);
	if (banned === !!user.renameBy) return user;
	let next;
	if (banned) next = {
		...user,
		renameBy: now + 7 * DAY_MS
	};
	else {
		next = { ...user };
		delete next.renameBy;
		delete next.renameFor;
	}
	await setUser(user.login, next);
	return next;
}
function publicProfile(user, now = Date.now()) {
	if (!user) return null;
	const banned = nameBanned(user);
	return {
		login: user.login,
		name: user.name,
		emblem: user.emblem || "star",
		playerId: user.playerId,
		createdAt: user.createdAt,
		stats: {
			...emptyStats(),
			...user.stats
		},
		hasRecovery: !!user.recHash,
		birthYear: user.birthYear || null,
		kidsMode: kidsModeOf(user),
		nameNextAt: nameNextAt(user, now),
		renameBy: banned && user.renameBy ? user.renameBy : null,
		blocked: isBlocked(user, now)
	};
}
async function userBySession(token) {
	if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
	const value = await getSession(token);
	if (!value) return null;
	const [login, epoch = "0"] = String(value).split(":");
	const user = await getUser(login);
	return user && String(user.epoch || 0) === epoch ? user : null;
}
async function bumpStats(login, patch) {
	if (!login) return;
	const u = await getUser(login);
	if (!u) return;
	const s = {
		...emptyStats(),
		...u.stats
	};
	Object.entries(patch).forEach(([k, v]) => {
		s[k] = typeof v === "number" && k !== "lastRoom" ? (s[k] || 0) + v : v;
	});
	await setUser(login, {
		...u,
		stats: s
	});
}
// api/reports.js
const REASONS = {
	answer: "Ошибка в ответе",
	accept: "Мой ответ должен быть засчитан",
	typo: "Опечатка или ошибка в тексте",
	unclear: "Непонятно объяснено",
	theory: "Ошибка в теории или примере",
	formula: "Ошибка в формуле или на графике",
	visual: "Что-то выглядит не так",
	broken: "Не работает",
	filter: "Фильтр не пропустил имя",
	crash: "Сбой экрана"
};
const CRASH_KINDS = [
	"boundary",
	"error",
	"promise"
];
function sanitizeCrash(body) {
	const message = str(body.message, 300);
	if (!message) return null;
	const kind = CRASH_KINDS.includes(body.kind) ? body.kind : "error";
	const context = {};
	[
		["screen", 80],
		["build", 60],
		["device", 200],
		["viewport", 30]
	].forEach(([k, max]) => {
		const v = str(body[k], max);
		if (v) context[k] = v;
	});
	const stack = str(body.stack, 1500);
	return {
		reason: "crash",
		kind,
		comment: stack ? `${message}\n${stack}` : message,
		context,
		sig: `${context.build || ""}|${message}|${stack.split("\n")[1] || ""}`.slice(0, 400)
	};
}
const clientIp$1 = (req) => String(req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"]) || "local").split(",")[0].trim();
const ownerLogins = () => String(process.env.OWNER_LOGINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const isOwner = (user) => !!user && ownerLogins().includes(String(user.login).toLowerCase());
const str = (v, max) => typeof v === "string" || typeof v === "number" ? Array.from(String(v)).filter((ch) => ch === "\n" || ch.charCodeAt(0) >= 32).join("").trim().slice(0, max) : "";
const CTX_KEYS = {
	screen: 60,
	kind: 30,
	mode: 20,
	lesson: 64,
	unit: 64,
	exercise: 120,
	variant: 60,
	prompt: 1500,
	answer: 500,
	correct: 500,
	numbers: 500,
	quote: 500,
	page: 200,
	build: 60,
	device: 200,
	viewport: 30,
	step: 200
};
const idList = (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\s,;]+/) : []).map((x) => str(x, 40)).filter(Boolean).slice(0, 500);
const matchesId = (r, key) => r.id === key || String(r.id).split("-")[0] === key;
function sanitizeReport(body) {
	const reason = typeof body.reason === "string" && REASONS[body.reason] ? body.reason : null;
	if (!reason) return null;
	const c = body.context && typeof body.context === "object" ? body.context : {};
	const context = {};
	Object.entries(CTX_KEYS).forEach(([k, max]) => {
		const v = str(c[k], max);
		if (v) context[k] = v;
	});
	return {
		reason,
		comment: str(body.comment, 1e3),
		context
	};
}
async function handleRequest$6(req, res) {
	if (req.method !== "POST") return res.status(405).json({ error: "Только POST" });
	let body;
	try {
		body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
	} catch {
		return res.status(400).json({ error: "Некорректный JSON" });
	}
	const action = body.action || "send";
	if (action === "filter") {
		if (await hit(`report-filter:${clientIp$1(req)}`, 3600) > 5) return res.status(429).json({ error: "Уже получили — спасибо, разберём" });
		const login = str(body.login, 40);
		const name = str(body.name, 40);
		if (!login && !name) return res.status(400).json({ error: "Нечего проверять" });
		await setReport({
			id: `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`,
			at: Date.now(),
			login: login || "—",
			name: name || "—",
			status: "new",
			reason: "filter",
			comment: "Фильтр грубых слов не пропустил имя или логин — проверьте, не ошибка ли",
			context: { screen: str(body.screen, 60) || "register" }
		});
		return res.status(200).json({ ok: true });
	}
	if (action === "crash") {
		if (await hit(`crash:${clientIp$1(req)}`, 3600) > 10) return res.status(429).json({ error: "Слишком часто" });
		const c = sanitizeCrash(body);
		if (!c) return res.status(400).json({ error: "Пустое сообщение" });
		const same = (await getReports()).find((r) => r.reason === "crash" && r.sig === c.sig && r.status !== "done");
		if (same) await setReport({
			...same,
			n: (same.n || 1) + 1,
			at: Date.now()
		});
		else await setReport({
			id: `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`,
			at: Date.now(),
			login: "—",
			name: "—",
			status: "new",
			n: 1,
			...c
		});
		return res.status(200).json({ ok: true });
	}
	const user = await userBySession(body.session);
	if (!user) return res.status(401).json({ error: "Сообщить об ошибке можно после входа в профиль" });
	if (action === "me") return res.status(200).json({ owner: isOwner(user) });
	if (action === "send") {
		const r = sanitizeReport(body);
		if (!r) return res.status(400).json({ error: "Выберите причину" });
		if (isRude(r.comment)) return res.status(400).json({ error: RUDE_MESSAGE });
		if (await hit(`report:${user.login}`, 3600) > 20 || await hit(`report-ip:${clientIp$1(req)}`, 3600) > 60) return res.status(429).json({ error: "Слишком много сообщений за час — спасибо, попробуйте чуть позже" });
		const entry = {
			id: `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`,
			at: Date.now(),
			login: user.login,
			name: user.name,
			status: "new",
			...r
		};
		await setReport(entry);
		return res.status(200).json({
			ok: true,
			id: entry.id,
			storage: hasKv() ? "kv" : "memory"
		});
	}
	if (!isOwner(user)) return res.status(403).json({ error: "Сообщения видят только владельцы" });
	if (action === "list") {
		const status = body.status === "done" ? "done" : body.status === "all" ? "all" : "new";
		const all = (await getReports()).sort((a, b) => b.at - a.at);
		const counts = {
			new: all.filter((x) => x.status !== "done").length,
			done: all.filter((x) => x.status === "done").length
		};
		const shown = all.filter((x) => status === "all" || (status === "done" ? x.status === "done" : x.status !== "done")).map((x) => ({
			...x,
			rude: isRude(x.comment) || isRude(x.name) || isRude(x.login)
		}));
		return res.status(200).json({
			reports: shown,
			counts
		});
	}
	if (action === "status") {
		const r = (await getReports()).find((x) => x.id === body.id);
		if (!r) return res.status(404).json({ error: "Сообщение не найдено" });
		const next = {
			...r,
			status: body.status === "done" ? "done" : "new",
			doneBy: body.status === "done" ? user.login : null,
			doneAt: body.status === "done" ? Date.now() : null
		};
		await setReport(next);
		return res.status(200).json({ report: next });
	}
	if (action === "status-many") {
		const keys = idList(body.ids);
		if (!keys.length) return res.status(400).json({ error: "Вставьте id сообщений" });
		const done = body.status !== "new";
		const all = await getReports();
		const missing = [];
		const ambiguous = [];
		const picked = /* @__PURE__ */ new Map();
		keys.forEach((k) => {
			const hits = all.filter((r) => matchesId(r, k));
			const exact = hits.find((r) => r.id === k);
			if (exact) picked.set(exact.id, exact);
			else if (hits.length === 1) picked.set(hits[0].id, hits[0]);
			else (hits.length ? ambiguous : missing).push(k);
		});
		await setReports([...picked.values()].map((r) => ({
			...r,
			status: done ? "done" : "new",
			doneBy: done ? user.login : null,
			doneAt: done ? Date.now() : null
		})));
		return res.status(200).json({
			changed: picked.size,
			missing,
			ambiguous
		});
	}
	if (action === "done-all") {
		const upto = Number.isFinite(Number(body.upto)) && body.upto != null ? Number(body.upto) : Infinity;
		const now = Date.now();
		const fresh = (await getReports()).filter((r) => r.status !== "done" && r.at <= upto);
		await setReports(fresh.map((r) => ({
			...r,
			status: "done",
			doneBy: user.login,
			doneAt: now
		})));
		return res.status(200).json({ changed: fresh.length });
	}
	if (action === "purge-done") {
		const done = (await getReports()).filter((r) => r.status === "done").map((r) => r.id);
		await deleteReports(done);
		return res.status(200).json({ deleted: done.length });
	}
	if (action === "delete") {
		if (typeof body.id !== "string") return res.status(400).json({ error: "Нет id" });
		await deleteReport(body.id);
		return res.status(200).json({ ok: true });
	}
	return res.status(400).json({ error: "Неизвестное действие" });
}
async function handler$6(req, res) {
	try {
		return await handleRequest$6(req, res);
	} catch (err) {
		console.error("reports handler error:", err);
		return res.status(500).json({ error: "Внутренняя ошибка сервера" });
	}
}
// api/account.js
const EMBLEMS = /* @__PURE__ */ new Set([
	"star",
	"crown",
	"landmark",
	"coins",
	"shield",
	"anchor",
	"factory",
	"wheat"
]);
const MAX_FAILS = 5;
const LOCK_STEPS = [
	6e4,
	3e5,
	9e5,
	36e5,
	216e5
];
const lockFor = (level) => LOCK_STEPS[Math.min(Math.max(level, 1), LOCK_STEPS.length) - 1];
const cleanName$2 = (v) => {
	if (typeof v !== "string") return null;
	const t = Array.from(v).filter((ch) => ch.charCodeAt(0) >= 32).join("").replace(/\s+/g, " ").trim().slice(0, 24);
	return t.length >= 2 ? t : null;
};
const cleanParentName = (v) => {
	if (typeof v !== "string") return null;
	const t = Array.from(v).filter((ch) => ch.charCodeAt(0) >= 32).join("").replace(/\s+/g, " ").trim().slice(0, 60);
	return t.length >= 2 ? t : null;
};
const validPlayerId$2 = (id) => typeof id === "string" && id.length > 0 && id.length <= 64;
const REG_PER_HOUR = 5;
const RECOVER_PER_HOUR = 10;
const clientIp = (req) => String(req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"]) || "local").split(",")[0].trim().slice(0, 64);
const storage = () => hasKv() ? "kv" : "memory";
const BLOCKED_OK = /* @__PURE__ */ new Set([
	"me",
	"update",
	"logout",
	"export",
	"delete",
	"password",
	"recovery_new"
]);
const BLOCKED_MSG = "Аккаунт заблокирован: ник нарушает правила. Смените ник — и всё снова откроется.";
const dayText = (ts) => new Date(ts).toLocaleDateString("ru-RU", {
	day: "numeric",
	month: "long",
	timeZone: "UTC"
});
async function openSession(user) {
	const token = newToken();
	await setSession(token, sessionValue(user));
	return token;
}
async function handleRequest$5(req, res) {
	if (req.method !== "POST") return res.status(405).json({ error: "Только POST" });
	let body;
	try {
		body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
	} catch {
		return res.status(400).json({ error: "Некорректный JSON" });
	}
	if (!body || typeof body !== "object") return res.status(400).json({ error: "Некорректное тело запроса" });
	const { action } = body;
	if (action === "register") {
		const login = cleanLogin(body.login);
		if (!LOGIN_RE.test(login)) return res.status(400).json({ error: "Логин: от 3 до 20 латинских букв, цифр или «_»" });
		if (!newPasswordOk(body.password)) return res.status(400).json({ error: `Пароль — ${PASSWORD_HINT}` });
		if (body.consentPage !== true) return res.status(400).json({ error: "Отметьте, что ознакомились со страницей «Данные и конфиденциальность»" });
		if (body.consentPd !== true) return res.status(400).json({ error: "Нужно согласие на обработку персональных данных" });
		if (!validBirthYear(body.birthYear)) return res.status(400).json({ error: "Укажите год рождения" });
		const child = needsParent(body.birthYear);
		const parentName = child ? cleanParentName(body.parentName) : null;
		if (child && (body.parentConsent !== true || !parentName)) return res.status(400).json({ error: "До 14 лет нужно подтверждение родителя: отметка и его имя" });
		if (parentName && isRude(parentName)) return res.status(400).json({ error: RUDE_NAME });
		const name = cleanName$2(body.name) || login;
		if (isRude(login) || isRude(name)) return res.status(400).json({ error: RUDE_NAME });
		if (await hit(`reg:${clientIp(req)}`, 3600) > REG_PER_HOUR) return res.status(429).json({ error: "Слишком много регистраций с этого адреса — попробуйте через час" });
		if (await getUser(login)) return res.status(409).json({ error: "Такой логин уже занят" });
		const { salt, hash } = hashPassword(body.password);
		const playerId = validPlayerId$2(body.playerId) ? body.playerId : randomUUID();
		const recoveryCode = newRecoveryCode();
		const user = {
			login,
			name,
			emblem: "star",
			salt,
			hash,
			...hashRecovery(recoveryCode),
			epoch: 0,
			playerId,
			birthYear: body.birthYear,
			createdAt: Date.now(),
			consentAt: Date.now(),
			pdConsentAt: Date.now(),
			...child ? {
				parentConsentAt: Date.now(),
				parentName
			} : {},
			stats: emptyStats(),
			fails: 0,
			lockUntil: 0
		};
		await setUser(login, user);
		const token = await openSession(user);
		return res.status(200).json({
			token,
			profile: publicProfile(user),
			recoveryCode,
			storage: storage()
		});
	}
	if (action === "login") {
		if (await hit(`login:${clientIp(req)}`, 3600) > 30) return res.status(429).json({ error: "Слишком много попыток входа с этого адреса — попробуйте через час" });
		const login = cleanLogin(body.login);
		const user = LOGIN_RE.test(login) ? await getUser(login) : null;
		if (!user) {
			hashPassword(String(body.password || ""));
			return res.status(401).json({ error: "Неверный логин или пароль" });
		}
		if (user.lockUntil && user.lockUntil > Date.now()) return res.status(429).json({ error: `Слишком много попыток — подождите ${Math.ceil((user.lockUntil - Date.now()) / 6e4)} мин.` });
		if (!checkPassword(body.password, user)) {
			const fails = (user.fails || 0) + 1;
			const level = fails >= MAX_FAILS ? (user.lockLevel || 0) + 1 : user.lockLevel || 0;
			await setUser(login, {
				...user,
				fails: fails >= MAX_FAILS ? 0 : fails,
				lockLevel: level,
				lockUntil: fails >= MAX_FAILS ? Date.now() + lockFor(level) : 0
			});
			return res.status(401).json({ error: "Неверный логин или пароль" });
		}
		if (user.fails || user.lockLevel) await setUser(login, {
			...user,
			fails: 0,
			lockLevel: 0,
			lockUntil: 0
		});
		const token = await openSession(user);
		const checked = await checkName(user.fails || user.lockLevel ? {
			...user,
			fails: 0,
			lockLevel: 0,
			lockUntil: 0
		} : user);
		return res.status(200).json({
			token,
			profile: publicProfile(checked),
			storage: storage()
		});
	}
	if (action === "recover") {
		if (await hit(`rec:${clientIp(req)}`, 3600) > RECOVER_PER_HOUR) return res.status(429).json({ error: "Слишком много попыток — попробуйте через час" });
		const login = cleanLogin(body.login);
		const user = LOGIN_RE.test(login) ? await getUser(login) : null;
		if (!newPasswordOk(body.newPassword)) return res.status(400).json({ error: `Новый пароль — ${PASSWORD_HINT}` });
		if (!user || !checkRecovery(body.code, user)) {
			if (!user) hashPassword("x");
			return res.status(401).json({ error: "Логин или код восстановления не подходят" });
		}
		const recoveryCode = newRecoveryCode();
		const next = {
			...user,
			...hashPassword(body.newPassword),
			...hashRecovery(recoveryCode),
			epoch: (user.epoch || 0) + 1,
			fails: 0,
			lockUntil: 0
		};
		await setUser(login, next);
		const token = await openSession(next);
		return res.status(200).json({
			token,
			profile: publicProfile(await checkName(next)),
			recoveryCode,
			storage: storage()
		});
	}
	const user = await checkName(await userBySession(body.token));
	if (!user) return res.status(401).json({ error: "Войдите в профиль заново" });
	if (isBlocked(user) && !BLOCKED_OK.has(action)) return res.status(403).json({
		error: BLOCKED_MSG,
		blocked: true
	});
	if (action === "me") return res.status(200).json({
		profile: publicProfile(user),
		storage: storage()
	});
	if (action === "update") {
		const next = { ...user };
		if (isBlocked(user) && Object.keys(body).some((k) => ![
			"action",
			"token",
			"name"
		].includes(k))) return res.status(403).json({
			error: BLOCKED_MSG,
			blocked: true
		});
		if (body.name !== void 0) {
			const n = cleanName$2(body.name);
			if (!n) return res.status(400).json({ error: "Имя — от 2 до 24 символов" });
			if (isRude(n)) return res.status(400).json({ error: RUDE_NAME });
			if (n !== user.name) {
				if (user.renameFor && n === user.renameFor) return res.status(400).json({ error: RUDE_NAME });
				const wait = nameNextAt(user);
				if (wait) return res.status(429).json({
					error: `Ник можно менять раз в 30 дней — следующий раз ${dayText(wait)}`,
					nameNextAt: wait
				});
				next.name = n;
				if (!nameBanned(user)) next.nameAt = Date.now();
				delete next.renameBy;
				delete next.renameFor;
			}
		}
		if (body.emblem !== void 0) {
			if (!EMBLEMS.has(body.emblem)) return res.status(400).json({ error: "Нет такого значка" });
			next.emblem = body.emblem;
		}
		if (body.birthYear !== void 0) {
			if (user.birthYear) return res.status(400).json({ error: "Год рождения уже указан" });
			if (!validBirthYear(body.birthYear)) return res.status(400).json({ error: "Укажите год рождения" });
			next.birthYear = body.birthYear;
		}
		if (body.kidsMode !== void 0) {
			if (typeof body.kidsMode !== "boolean") return res.status(400).json({ error: "Некорректный режим" });
			const year = next.birthYear;
			if (!body.kidsMode && (!year || isKid(year))) return res.status(403).json({ error: "До 16 лет «Мир» — в детском режиме" });
			next.kidsMode = body.kidsMode;
		}
		delete next.leaguePublic;
		await setUser(user.login, next);
		return res.status(200).json({ profile: publicProfile(next) });
	}
	if (action === "require-rename") {
		if (!isOwner(user)) return res.status(403).json({ error: "Только для владельцев" });
		const login = cleanLogin(body.login);
		const target = LOGIN_RE.test(login) ? await getUser(login) : null;
		if (!target) return res.status(404).json({ error: "Нет такого ученика" });
		const renameBy = target.renameBy && nameBanned(target) ? target.renameBy : Date.now() + 7 * DAY_MS;
		await setUser(login, {
			...target,
			renameFor: target.name,
			renameBy
		});
		return res.status(200).json({
			ok: true,
			login,
			name: target.name,
			renameBy
		});
	}
	if (action === "league-names") {
		await dropLeagueNames();
		return res.status(200).json({ names: [] });
	}
	if (action === "card") {
		if (await hit(`card:${user.login}`, 60) > 20) return res.status(429).json({ error: "Слишком часто" });
		await setCard(user.login, {
			...cleanCard(body.card),
			at: Date.now()
		});
		return res.status(200).json({ ok: true });
	}
	if (action === "friends") return res.status(200).json(await friendsView(user));
	if (action === "friend-add") {
		const to = cleanLogin(body.login);
		if (!LOGIN_RE.test(to)) return res.status(400).json({ error: "Логин: латинские буквы, цифры и «_», от 3 до 20" });
		if (to === user.login) return res.status(400).json({ error: "Это ваш собственный логин" });
		if (await hit(`fadd:${user.login}`, 3600) > 30) return res.status(429).json({ error: "Слишком много заявок — попробуйте через час" });
		const other = await getUser(to);
		if (!other) return res.status(404).json({ error: "Ученика с таким логином нет" });
		const me = links(user);
		const them = links(other);
		if (me.friends[to]) return res.status(200).json({
			status: "friends",
			...await friendsView(user)
		});
		if (Object.keys(me.friends).length >= 100 || Object.keys(them.friends).length >= 100) return res.status(400).json({ error: `Друзей — не больше 100` });
		const now = Date.now();
		if (me.fin[to] || them.fout[user.login]) {
			const u = await save(user, {
				friends: {
					...me.friends,
					[to]: now
				},
				fin: without(me.fin, to),
				fout: without(me.fout, to)
			});
			await save(other, {
				friends: {
					...them.friends,
					[user.login]: now
				},
				fin: without(them.fin, user.login),
				fout: without(them.fout, user.login)
			});
			return res.status(200).json({
				status: "friends",
				...await friendsView(u)
			});
		}
		if (Object.keys(me.fout).length >= 50 || Object.keys(them.fin).length >= 50) return res.status(400).json({ error: "Слишком много заявок ждут ответа" });
		const u = await save(user, { fout: {
			...me.fout,
			[to]: now
		} });
		await save(other, { fin: {
			...them.fin,
			[user.login]: now
		} });
		return res.status(200).json({
			status: "sent",
			...await friendsView(u)
		});
	}
	if (action === "friend-answer" || action === "friend-cancel" || action === "friend-remove") {
		const who = cleanLogin(body.login);
		const other = LOGIN_RE.test(who) ? await getUser(who) : null;
		const me = links(user);
		const them = other ? links(other) : null;
		const now = Date.now();
		let mine = {};
		let theirs = {};
		if (action === "friend-answer") {
			if (!me.fin[who]) return res.status(404).json({ error: "Заявки нет" });
			const yes = body.accept === true && !!other;
			mine = {
				fin: without(me.fin, who),
				...yes ? { friends: {
					...me.friends,
					[who]: now
				} } : {}
			};
			if (them) theirs = {
				fout: without(them.fout, user.login),
				...yes ? { friends: {
					...them.friends,
					[user.login]: now
				} } : {}
			};
		} else if (action === "friend-cancel") {
			mine = { fout: without(me.fout, who) };
			if (them) theirs = { fin: without(them.fin, user.login) };
		} else {
			mine = { friends: without(me.friends, who) };
			if (them) theirs = { friends: without(them.friends, user.login) };
			const races = await getRaces(me.races);
			for (const r of races.filter((x) => [x.from, x.to].includes(who) && raceStatus(x, now) === "pending")) await setRace({
				...r,
				status: "cancelled"
			});
		}
		const u = await save(user, mine);
		if (other) await save(other, theirs);
		return res.status(200).json(await friendsView(u));
	}
	const restWhy = (rest, friend = false) => {
		const n = Math.max(1, Math.ceil((rest.until - Date.now()) / 864e5));
		const days = `${n} ${n % 10 === 1 && n % 100 !== 11 ? "день" : [
			2,
			3,
			4
		].includes(n % 10) && ![
			12,
			13,
			14
		].includes(n % 100) ? "дня" : "дней"}`;
		if (friend) return `У друга идёт забег или отдых после него — позовите через ${days}`;
		if (rest.why === "busy") return "У вас уже идёт забег — следующий можно после финиша";
		if (rest.why === "same") return `С одним другом забег — раз в неделю: снова можно через ${days}`;
		return `После забега — три дня отдыха: следующий можно через ${days}`;
	};
	if (action === "race-invite") {
		const to = cleanLogin(body.login);
		const me = links(user);
		if (!me.friends[to]) return res.status(400).json({ error: "Позвать на забег можно только друга" });
		const other = await getUser(to);
		if (!other) return res.status(404).json({ error: "Ученика с таким логином нет" });
		const now = Date.now();
		if (Number(me.friends[to]) > now - RACE.friendMs) return res.status(400).json({ error: "Позвать на забег можно через сутки дружбы" });
		const races = await getRaces(me.races);
		if (races.some((r) => [r.from, r.to].includes(to) && raceOpen(r, now))) return res.status(400).json({ error: "С этим другом забег уже идёт или ждёт ответа" });
		if (races.filter((r) => r.from === user.login && raceStatus(r, now) === "pending").length >= RACE.maxOpen) return res.status(400).json({ error: "Подождите ответа на прошлые приглашения" });
		const mine = raceRest(races, user.login, to, now);
		if (mine) return res.status(400).json({ error: restWhy(mine) });
		const theirs = raceRest(await getRaces(links(other).races), to, user.login, now);
		if (theirs) return res.status(400).json({ error: restWhy(theirs, true) });
		if (await hit(`race:${user.login}`, 86400) > 10) return res.status(429).json({ error: "Сегодня приглашений уже достаточно" });
		const race = {
			id: randomUUID().replace(/-/g, "").slice(0, 16),
			from: user.login,
			to,
			at: now,
			status: "pending",
			days: RACE.days
		};
		await setRace(race);
		const u = await save(user, { races: [race.id, ...me.races].slice(0, RACE.keep) });
		const them = links(other);
		await save(other, { races: [race.id, ...them.races].slice(0, RACE.keep) });
		return res.status(200).json(await friendsView(u));
	}
	if (action === "race-answer") {
		const me = links(user);
		const [race] = typeof body.id === "string" && me.races.includes(body.id) ? await getRaces([body.id]) : [];
		if (!race || race.to !== user.login) return res.status(404).json({ error: "Приглашения нет" });
		const st = raceStatus(race);
		if (st !== "pending") return res.status(400).json({ error: st === "expired" ? "Сутки на ответ уже прошли" : "На приглашение уже ответили" });
		if (body.accept === true) {
			const rest = raceRest(await getRaces(me.races), user.login, race.from, Date.now());
			if (rest) return res.status(400).json({ error: restWhy(rest) });
		}
		const start = new Date(Date.now()).toISOString().slice(0, 10);
		let base = null;
		if (body.accept === true) {
			const fromCard = (await getCards([race.from]))[race.from];
			const theirs = fromCard && fromCard.xpDays ? Number(fromCard.xpDays[start]) || 0 : 0;
			const mine = Number.isFinite(Number(body.base)) ? Math.max(0, Math.min(5e3, Math.round(Number(body.base)))) : 0;
			base = {
				[race.to]: mine,
				[race.from]: Math.max(0, Math.min(5e3, Math.round(theirs)))
			};
		}
		await setRace(body.accept === true ? {
			...race,
			status: "active",
			acceptedAt: Date.now(),
			start,
			base
		} : {
			...race,
			status: "declined",
			answeredAt: Date.now()
		});
		return res.status(200).json(await friendsView(user));
	}
	if (action === "password") {
		if (!checkPassword(body.oldPassword, user)) return res.status(403).json({ error: "Старый пароль не подходит" });
		if (!newPasswordOk(body.newPassword)) return res.status(400).json({ error: `Новый пароль — ${PASSWORD_HINT}` });
		const next = {
			...user,
			...hashPassword(body.newPassword),
			epoch: (user.epoch || 0) + 1
		};
		await setUser(user.login, next);
		const token = await openSession(next);
		return res.status(200).json({
			ok: true,
			token
		});
	}
	if (action === "recovery_new") {
		if (!checkPassword(body.password, user)) return res.status(403).json({ error: "Пароль не подходит" });
		const recoveryCode = newRecoveryCode();
		const next = {
			...user,
			...hashRecovery(recoveryCode)
		};
		await setUser(user.login, next);
		return res.status(200).json({
			recoveryCode,
			profile: publicProfile(next)
		});
	}
	if (action === "export") {
		const pid = user.playerId;
		const rec = (await getRecords("tycoon"))[user.login];
		return res.status(200).json({
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			account: {
				...publicProfile(user),
				consentAt: user.consentAt || null,
				pdConsentAt: user.pdConsentAt || null,
				parentConsentAt: user.parentConsentAt || null,
				parentName: user.parentName || null
			},
			progress: pid ? await getProfile(pid) : null,
			friends: Object.keys(links(user).friends),
			card: (await getCards([user.login]))[user.login] || null,
			saves: pid ? {
				solo: await getSoloSlots(pid),
				tycoon: await getTycoonSlots(pid)
			} : null,
			records: rec ? { tycoon: typeof rec === "string" ? JSON.parse(rec) : rec } : {},
			reports: (await getReports()).filter((r) => r.login === user.login)
		});
	}
	if (action === "delete") {
		if (!checkPassword(body.password, user)) return res.status(403).json({ error: "Пароль не подходит" });
		await deleteUserData({
			login: user.login,
			playerId: user.playerId
		});
		return res.status(200).json({ ok: true });
	}
	if (action === "logout") {
		await delSession(body.token);
		return res.status(200).json({ ok: true });
	}
	return res.status(400).json({ error: "Неизвестное действие" });
}
function links(u) {
	const m = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
	return {
		friends: m(u.friends),
		fin: m(u.fin),
		fout: m(u.fout),
		races: Array.isArray(u.races) ? u.races.filter((x) => typeof x === "string").slice(0, RACE.keep) : []
	};
}
const without = (map, key) => {
	const out = { ...map };
	delete out[key];
	return out;
};
async function save(user, patch) {
	const next = {
		...await getUser(user.login) || user,
		...patch
	};
	await setUser(user.login, next);
	return next;
}
const friendOut = (login, u, card) => ({
	login,
	name: nameBanned(u) ? nameForOthers(null, login) : nameForOthers(u.name || login, login),
	emblem: u.emblem || "star",
	card: card || null
});
async function friendsView(user) {
	const me = links(user);
	const now = Date.now();
	const races = (await getRaces(me.races)).map((r) => ({
		...r,
		status: raceStatus(r, now)
	})).filter((r) => r.status !== "cancelled");
	const users = await getUsers([.../* @__PURE__ */ new Set([
		...Object.keys(me.friends),
		...Object.keys(me.fin),
		...Object.keys(me.fout),
		...races.flatMap((r) => [r.from, r.to])
	])].filter((l) => l !== user.login));
	const cards = await getCards([
		...Object.keys(me.friends),
		...Object.keys(me.fin),
		...Object.keys(me.fout)
	].filter((l) => users[l]));
	const wearOnly = (l) => cards[l] && cards[l].wear ? { wear: cards[l].wear } : null;
	return {
		me: user.login,
		friends: Object.entries(me.friends).filter(([l]) => users[l]).map(([l, since]) => ({
			...friendOut(l, users[l], cards[l]),
			since
		})).sort((a, b) => a.name.localeCompare(b.name, "ru")),
		incoming: Object.entries(me.fin).filter(([l]) => users[l]).map(([l, at]) => ({
			...friendOut(l, users[l], wearOnly(l)),
			at
		})).sort((a, b) => b.at - a.at),
		outgoing: Object.entries(me.fout).filter(([l]) => users[l]).map(([l, at]) => ({
			...friendOut(l, users[l], wearOnly(l)),
			at
		})).sort((a, b) => b.at - a.at),
		races: races.filter((r) => users[r.from === user.login ? r.to : r.from]).map((r) => {
			const other = r.from === user.login ? r.to : r.from;
			const base = r.base || {};
			return {
				...r,
				other,
				mine: r.from === user.login,
				baseMine: base[user.login] || 0,
				baseTheirs: base[other] || 0
			};
		})
	};
}
async function handler$5(req, res) {
	try {
		await dropLeagueNames().catch(() => {});
		return await handleRequest$5(req, res);
	} catch (err) {
		console.error("account handler error:", err);
		return res.status(500).json({ error: "Внутренняя ошибка сервера" });
	}
}
// src/lib/catalog.js
const CONFIG = {
	population: 45,
	startYear: 2032,
	target: {
		inflation: 4,
		nairu: 5,
		foreignRate: 3,
		worldInflation: 3,
		neutralConfidence: 55,
		neutralStability: 70,
		neutralTrust: 55,
		minCapitalRatio: 10.5,
		riskWeight: .75,
		lgd: .45
	},
	prod: {
		alpha: .32,
		depreciation: 5,
		tfpBase: 1.55
	},
	shares: {
		wageBill: .47,
		profits: .21,
		capitalIncome: .055,
		nonTaxRevenue: .075
	},
	initial: {
		gdp: 2e3,
		priceLevel: 100,
		consumption: 1155,
		businessInvestment: 380,
		govPurchasesReal: 405,
		govInvestmentReal: 60,
		exports: 480,
		imports: 480,
		transfersReal: 175,
		capitalStock: 6e3,
		laborForce: 100,
		unemployment: 5,
		nairu: 5,
		wageGrowth: 6.3,
		productivity: 100,
		humanCapitalIndex: 100,
		infrastructureIndex: 100,
		inflation: 4,
		coreInflation: 4,
		inflationExpectations: 4,
		cbCredibility: 60,
		keyRate: 5.5,
		reserveReq: 6,
		capitalRequirement: 10.5,
		fxRegime: "free",
		lendingRate: 7.92,
		depositRate: 4.3,
		rStar: 1.55,
		riskPremium: 1.4,
		moneySupply: 100,
		exchangeRate: 100,
		realExchangeRate: 100,
		inflationTarget: 4,
		fxTarget: 100,
		incomeTaxRate: 15,
		profitTaxRate: 20,
		vatRate: 18,
		exciseRate: 8,
		capitalTaxRate: 13,
		socialContribRate: 22,
		shadowShare: 14,
		budgetShares: {
			health: 19,
			education: 16,
			science: 4,
			defense: 15,
			admin: 12,
			other: 34
		},
		govDebt: 1200,
		effectiveDebtRate: 6.5,
		sovereignFund: 0,
		creditVolume: 1400,
		bankCapital: 147,
		bankNPL: 3,
		bankLiquidity: 70,
		reserves: 300,
		fdi: 40,
		consumerConfidence: 55,
		businessConfidence: 55,
		financialStability: 70,
		govTrust: 55,
		approval: 55,
		quartersToElection: 16,
		term: 1,
		mandate: null,
		governmentLine: "centrist",
		politicalRegime: "democracy",
		politicalTension: 8,
		parliamentDissolved: false,
		unrestQuartersLeft: 0,
		politicalCapital: 55,
		cbTenure: 0,
		mofTenure: 0,
		presidentSatisfaction: 60,
		worldGdpGrowth: 2.5,
		worldInflation: 3,
		worldRate: 3,
		commodityIndex: 100,
		worldDemandIndex: 100,
		policyCoordination: 70
	},
	coef: {
		termPremium: .8,
		bankSpreadBase: 1.2,
		lendingPassthrough: {
			easy: .9,
			medium: .62,
			hard: .45
		},
		depositSpread: .8,
		creditDemandBase: 6,
		creditRateSens: 1.15,
		creditConfSens: .5,
		creditAccelerator: .45,
		creditReserveSens: .35,
		creditImpulseToDemand: .16,
		consInertia: .3,
		consIncome: .55,
		consRate: .3,
		consConf: .22,
		consCredit: .55,
		invInertia: .28,
		invAccelerator: .42,
		invRate: 1.25,
		invConf: .35,
		invCredit: .75,
		invCrowdIn: .35,
		invProfitTax: .45,
		capacityDrag: .3,
		exportWorld: .55,
		exportRer: .09,
		importIncome: .95,
		importRer: .07,
		tradeShareAnchor: .25,
		exportShareElasticity: .6,
		importShareElasticity: .5,
		floorPurchasesShare: .135,
		floorTransfersShare: .058,
		floorGovInvestmentShare: .012,
		okun: .45,
		uAdjust: .34,
		nairuHysteresis: .02,
		wageTightness: .8,
		wageExpect: 1,
		wageSocial: .3,
		phillipsLinear: .15,
		phillipsConvex: .022,
		ulcPass: .28,
		fxPass: .085,
		commodityPass: .012,
		worldInflPass: .1,
		vatPass: .35,
		expAdaptMin: .16,
		expAdaptMax: .42,
		nplRate: .55,
		nplUnemp: .35,
		nplGap: .4,
		nplCreditBoom: .75,
		nplAdjust: .2,
		multPurchases: [.55, .6],
		multTransfers: [.3, .5],
		multInvestment: [.6, .55],
		multTax: [.45, .4],
		capitalFlowCarry: 11,
		capitalFlowConf: .9,
		capitalFlowStab: .55,
		fxBop: 1.25,
		fxCarry: .3,
		debtRollover: .12,
		debtLevelPremium: .035
	},
	noiseBase: {
		consumption: .3,
		investment: .7,
		exports: .7,
		imports: .7,
		inflation: .22,
		exchangeRate: .9,
		financialStability: 1,
		consumerConfidence: 1.1,
		businessConfidence: 1.1,
		reserves: 3,
		fdi: 4,
		unemployment: .07,
		wageGrowth: .16,
		bankNPL: .09,
		productivity: .05,
		worldGdpGrowth: .2,
		worldInflation: .15,
		worldRate: .1,
		commodityIndex: 2,
		worldDemandIndex: 1.2,
		capitalFlow: 5
	},
	noiseMult: {
		easy: .55,
		medium: 1,
		hard: 1.55
	},
	lagSpread: {
		easy: [1],
		medium: [.55, .45],
		hard: [
			.3,
			.4,
			.3
		]
	},
	slowSpread: {
		easy: [.4, .6],
		medium: [
			.25,
			.4,
			.35
		],
		hard: [
			.15,
			.3,
			.35,
			.2
		]
	},
	eventProbability: {
		easy: .09,
		medium: .14,
		hard: .2
	},
	election: {
		cycle: 16,
		campaign: 3
	},
	thresholds: {
		bankingRisk: 70,
		debtRisk: 75,
		recessionGapQuarters: 2,
		recessionGap: -2,
		recessionGapExit: -.8,
		overheatGap: 3.5,
		stagflationInflation: 6.5,
		stagflationGap: -1,
		currencyMovePct: 11,
		deflation: .5,
		carCrunch: 10.5
	}
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const romanQ = (n) => [
	"I",
	"II",
	"III",
	"IV"
][n - 1] || String(n);
const quarterLabel = (qIndex) => {
	const year = CONFIG.startYear + Math.floor((qIndex - 1) / 4);
	const q = ((qIndex - 1) % 4 + 4) % 4 + 1;
	return `${romanQ(q)} кв. ${year}`;
};
const DIFFICULTIES = [
	{
		id: "easy",
		title: "Лёгкий",
		desc: "Быстрая трансмиссия, мягкие шоки, терпеливые ожидания."
	},
	{
		id: "medium",
		title: "Средний",
		desc: "Реалистичные лаги: решение действует 2–3 квартала."
	},
	{
		id: "hard",
		title: "Сложный",
		desc: "Длинные лаги, срыв ожиданий, банковские и долговые спирали."
	}
];
const GOALS$1 = [
	{
		id: "max_growth",
		label: "Максимальный рост ВВП",
		score: "potential"
	},
	{
		id: "min_inflation",
		label: "Минимальная инфляция",
		score: "stability"
	},
	{
		id: "min_unemployment",
		label: "Минимальная безработица",
		score: "welfare"
	},
	{
		id: "debt_reduction",
		label: "Снижение государственного долга",
		score: "fiscal"
	},
	{
		id: "stable_currency",
		label: "Стабильный курс валюты",
		score: "financial"
	},
	{
		id: "living_standards",
		label: "Повышение уровня жизни",
		score: "welfare"
	},
	{
		id: "balanced_budget",
		label: "Сбалансированный бюджет",
		score: "fiscal"
	},
	{
		id: "max_wealth",
		label: "Приумножить капитал",
		score: "financial",
		trader: true
	},
	{
		id: "beat_index",
		label: "Обогнать индекс акций",
		score: "financial",
		trader: true
	},
	{
		id: "beat_inflation",
		label: "Сохранить покупательную способность",
		score: "financial",
		trader: true
	},
	{
		id: "survive",
		label: "Пройти цикл без маржин-колла",
		score: "financial",
		trader: true
	},
	{
		id: "company_value",
		label: "Приумножить состояние владельца",
		score: "financial",
		entrepreneur: true
	},
	{
		id: "market_share",
		label: "Стать лидером рынка",
		score: "potential",
		entrepreneur: true
	}
];
const SCENARIOS = [
	{
		id: "sandbox",
		title: "Открытая партия",
		short: "Песочница",
		level: 1,
		levelLabel: "Лёгкий",
		levelNote: "Без стартового кризиса: ошибки видны, но исправимы.",
		desc: "Стабильная экономика без стартового кризиса — учиться или экспериментировать без давления времени.",
		overrides: null
	},
	{
		id: "currency_crisis",
		title: "Валютный кризис",
		short: "Курс и резервы",
		level: 3,
		levelLabel: "Трудный",
		levelNote: "Демократию удержать можно, но выборы проиграть легко: ошибки первого года стоят мандата.",
		desc: "Резервы уже наполовину истрачены, инфляция разогналась, ставка экстренно поднята — но доверие подорвано, и рынок ждёт девальвации.",
		overrides: {
			reserves: 60,
			inflation: 11,
			coreInflation: 9.5,
			inflationExpectations: 9,
			riskPremium: 3.4,
			keyRate: 15,
			lendingRate: 19,
			depositRate: 12,
			fxRegime: "managed",
			cbCredibility: 32,
			consumerConfidence: 32,
			businessConfidence: 30,
			approval: 38,
			politicalTension: 28,
			regime: "currency"
		}
	},
	{
		id: "housing_bubble",
		title: "Ипотечный пузырь",
		short: "Банки и кредит",
		level: 2,
		levelLabel: "Средний",
		levelNote: "Институты выдержат, но выборы проиграть легко: пузырь лопается под урну.",
		desc: "Кредитный бум уже случился: портфель раздут, просрочка растёт, капитал банков на исходе. Вопрос не в том, лопнет ли пузырь, а когда.",
		overrides: {
			creditVolume: 2100,
			bankCapital: 85,
			bankNPL: 8.5,
			bankLiquidity: 38,
			financialStability: 30,
			unemployment: 6.2,
			wageGrowth: 3.2,
			consumerConfidence: 40,
			businessConfidence: 38,
			approval: 45,
			regime: "banking"
		}
	},
	{
		id: "hyperinflation",
		title: "Гиперинфляция",
		short: "Доверие к деньгам",
		level: 4,
		levelLabel: "Самый трудный",
		levelNote: "Выигрывает примерно одна стратегия из пятнадцати, бездействие проигрывает всегда. Даже верная игра стоит глубокой рецессии.",
		desc: "Цены разгоняются на глазах, доверие к цели по инфляции разрушено, долг уже дорогой. Выход один — стабилизационная программа: жёсткая ставка вместе с бюджетом без дыры, пока у правительства держится мандат спасения. Постепенностью эту спираль не остановить.",
		overrides: {
			inflation: 34,
			coreInflation: 30,
			inflationExpectations: 27,
			cbCredibility: 18,
			keyRate: 24,
			lendingRate: 30,
			depositRate: 22,
			govDebt: 1700,
			effectiveDebtRate: 13,
			riskPremium: 4.2,
			consumerConfidence: 25,
			businessConfidence: 28,
			approval: 33,
			politicalTension: 34,
			wageGrowth: 26,
			regime: "currency",
			crisisMandateLeft: 6,
			crisisMandateTotal: 6
		}
	},
	{
		id: "volcker",
		title: "США, 1979–1982",
		short: "Инфляция и доверие к центральному банку",
		level: 3,
		levelLabel: "Трудный",
		historical: true,
		levelNote: "Инфляция двузначная и въелась в ожидания. Волкер задавил её ставкой под 20% — ценой двух рецессий и безработицы выше 10%.",
		desc: "Конец 1970-х: инфляция 12% и растёт, ожидания отвязаны, доверия к ЦБ почти нет. Реальный ФРС поднял ставку до 19% и держал, пока цены не сломались. Сможете дешевле?",
		shadow: {
			name: "ФРС при Волкере",
			from: "III кв. 1979",
			inflation: [
				11.8,
				12.7,
				14.2,
				14.4,
				12.9,
				12.6,
				11.1,
				9.6,
				10.8,
				9.6,
				7.6,
				6.8,
				5.8,
				4.5,
				3.6,
				3.3
			],
			keyRate: [
				10.9,
				13.6,
				15.1,
				12.7,
				9.8,
				15.9,
				16.6,
				17.8,
				17.6,
				13.6,
				14.2,
				14.5,
				11,
				9.3,
				8.7,
				8.8
			],
			unemployment: [
				5.9,
				6,
				6.3,
				7.3,
				7.7,
				7.4,
				7.4,
				7.4,
				7.4,
				8.2,
				8.8,
				9.4,
				9.9,
				10.7,
				10.4,
				10.1
			],
			gdpGrowth: [
				1.5,
				1.3,
				1.4,
				-.8,
				-1.1,
				0,
				1.2,
				2.6,
				4.3,
				1.3,
				-1.6,
				-2.2,
				-2.3,
				-1.4,
				.6,
				2.8
			]
		},
		overrides: {
			inflation: 11.8,
			coreInflation: 10.5,
			inflationExpectations: 10,
			cbCredibility: 28,
			keyRate: 10.9,
			lendingRate: 13.5,
			depositRate: 9,
			wageGrowth: 9.5,
			unemployment: 5.9,
			consumerConfidence: 38,
			businessConfidence: 42,
			approval: 40,
			politicalTension: 22
		}
	},
	{
		id: "turkey2021",
		title: "Турция, 2021–2023",
		short: "Снижение ставки при высокой инфляции",
		level: 3,
		levelLabel: "Трудный",
		historical: true,
		levelNote: "Инфляция под 20%, а президент требует снижать ставку. В реальности ставку снизили с 19% до 8,5% — инфляция ушла за 80%, лира обвалилась.",
		desc: "Осень 2021-го: инфляция 20%, а ставку снижают, считая, что высокая ставка сама разгоняет цены. В реальности инфляция дошла до 85%. Удержите цены лучше?",
		shadow: {
			name: "ЦБ Турции",
			from: "III кв. 2021",
			inflation: [
				19.6,
				36.1,
				61.1,
				78.6,
				83.5,
				64.3,
				50.5,
				38.2,
				61.5,
				64.8
			],
			keyRate: [
				18,
				14,
				14,
				14,
				12,
				9,
				8.5,
				15,
				30,
				42.5
			],
			unemployment: [
				11.5,
				11.2,
				11.3,
				10.3,
				10.1,
				10.2,
				10,
				9.5,
				9.2,
				8.8
			],
			gdpGrowth: [
				7.9,
				9.6,
				7.5,
				7.7,
				3.9,
				3.5,
				4,
				3.9,
				6.1,
				4
			]
		},
		overrides: {
			inflation: 19.6,
			coreInflation: 17,
			inflationExpectations: 17,
			cbCredibility: 30,
			keyRate: 18,
			lendingRate: 21,
			depositRate: 16,
			wageGrowth: 18,
			unemployment: 11.5,
			nairu: 10.8,
			riskPremium: 3.6,
			reserves: 110,
			consumerConfidence: 36,
			businessConfidence: 44,
			approval: 42,
			politicalTension: 26,
			regime: "currency"
		}
	},
	{
		id: "greece2010",
		title: "Греция, 2010–2013",
		short: "Долговой кризис без своей ставки",
		level: 3,
		levelLabel: "Трудный",
		historical: true,
		noRoles: ["central_bank"],
		levelNote: "Долг под 130% ВВП, дефицит 15%, рынок закрыт. Валютный союз: курс и ставку не выбрать, роль ЦБ недоступна. Реальная Греция прошла через жёсткую экономию: ВВП −25%, безработица 27%.",
		desc: "Весна 2010-го: долг 130% ВВП, дефицит двузначный, инвесторы требуют 10% за риск. Своей ставки нет — только бюджет. Реальная экономия обвалила экономику на четверть. Найдёте путь мягче?",
		shadow: {
			name: "Греция",
			from: "I кв. 2010",
			unemployment: [
				11.6,
				12.3,
				12.6,
				14.2,
				15.9,
				16.7,
				18.4,
				20.7,
				22.1,
				23.8,
				24.9,
				26,
				27,
				27.2,
				27.5,
				27.4
			],
			gdpGrowth: [
				-2.5,
				-4.5,
				-6.5,
				-8,
				-8.2,
				-7,
				-9.8,
				-11.3,
				-8,
				-7.1,
				-6.8,
				-5.8,
				-5.5,
				-3.6,
				-2.9,
				-1.2
			],
			inflation: [
				3,
				5,
				5.6,
				5.1,
				4.5,
				3.3,
				2,
				2.2,
				1.6,
				1,
				.6,
				.3,
				-.4,
				-.3,
				-1,
				-2
			],
			debtToGdp: [
				130,
				138,
				143,
				146,
				151,
				157,
				165,
				172,
				160,
				158,
				162,
				157,
				165,
				173,
				176,
				178
			]
		},
		overrides: {
			govDebt: 2600,
			effectiveDebtRate: 7.5,
			riskPremium: 9,
			budgetBalancePctGdp: -13,
			unemployment: 11.6,
			nairu: 11,
			inflation: 3,
			coreInflation: 2.5,
			inflationExpectations: 3,
			consumerConfidence: 24,
			businessConfidence: 26,
			approval: 36,
			politicalTension: 38,
			keyRate: 1,
			fxRegime: "union",
			currencyUnion: {
				name: "ЕЦБ",
				ratePath: [
					1,
					1,
					1,
					1,
					1,
					1.25,
					1.5,
					1.25,
					1,
					1,
					.75,
					.75,
					.75,
					.5,
					.5,
					.25
				]
			}
		}
	},
	{
		id: "russia2014",
		title: "Россия, 2014–2016",
		short: "Обвал курса и отток капитала",
		level: 3,
		levelLabel: "Трудный",
		historical: true,
		levelNote: "Нефть упала вдвое, санкции закрыли рынки, рубль падает. 16 декабря ЦБ поднял ставку с 10,5% до 17% за ночь.",
		desc: "Осень 2014-го: нефть дешевеет, санкции, отток капитала, рубль теряет треть. Реальный ЦБ отпустил курс и поднял ставку до 17%. Инфляция всё равно дошла до 17%, ВВП ушёл в минус.",
		shadow: {
			name: "ЦБ России",
			from: "III кв. 2014",
			inflation: [
				8,
				11.4,
				16.9,
				15.3,
				15.7,
				12.9,
				7.3,
				7.5,
				6.4,
				5.4
			],
			keyRate: [
				8,
				17,
				14,
				11.5,
				11,
				11,
				11,
				10.5,
				10,
				10
			],
			unemployment: [
				4.9,
				5.3,
				5.8,
				5.4,
				5.2,
				5.8,
				6,
				5.6,
				5.4,
				5.4
			],
			gdpGrowth: [
				.9,
				.2,
				-2.8,
				-4.5,
				-3.7,
				-3.2,
				-1.2,
				-.6,
				-.4,
				.3
			]
		},
		overrides: {
			inflation: 8,
			coreInflation: 7.5,
			inflationExpectations: 8,
			keyRate: 9.5,
			lendingRate: 13,
			depositRate: 8,
			riskPremium: 5,
			reserves: 70,
			cbCredibility: 42,
			fxDeprAnnual: 25,
			consumerConfidence: 34,
			businessConfidence: 36,
			exportsGrowthShock: -4,
			approval: 60,
			politicalTension: 18,
			regime: "currency"
		}
	}
];
const CB_PERSONAS = [
	{
		id: "hawk",
		name: "Ястреб",
		title: "Бескомпромиссный инфляционный таргетёр",
		infl: 2.1,
		gap: .25,
		smooth: .7,
		maxMove: 1.75,
		tolerance: .7,
		fiscalLean: .35,
		macropru: 1,
		desc: "Ставит цель по инфляции выше занятости. Жёстко реагирует на бюджетную экспансию."
	},
	{
		id: "pragmatic",
		name: "Прагматик",
		title: "Гибкое таргетирование инфляции",
		infl: 1.5,
		gap: .6,
		smooth: .74,
		maxMove: 1.25,
		tolerance: 1.2,
		fiscalLean: .2,
		macropru: .6,
		desc: "Балансирует инфляцию и выпуск, сглаживает траекторию ставки."
	},
	{
		id: "dove",
		name: "Голубь",
		title: "Приоритет занятости и роста",
		infl: 1.05,
		gap: 1,
		smooth: .82,
		maxMove: .75,
		tolerance: 2.2,
		fiscalLean: .05,
		macropru: .3,
		desc: "Терпит инфляцию ради роста. Рискует потерей доверия и срывом ожиданий."
	}
];
const MOF_PERSONAS = [
	{
		id: "technocrat",
		name: "Технократ",
		title: "Бюджетное правило и инвестиции",
		anchor: -2,
		cyclical: .55,
		taxWill: .6,
		debtLimit: 75,
		transferBias: .8,
		investBias: 1.4,
		shares: {
			health: 19,
			education: 20,
			science: 7,
			defense: 13,
			admin: 10
		},
		desc: "Держит дефицит у правила, в кризис умеренно стимулирует, вкладывается в образование и науку."
	},
	{
		id: "austerity",
		name: "Консерватор",
		title: "Жёсткая бюджетная дисциплина",
		anchor: -.5,
		cyclical: .22,
		taxWill: .3,
		debtLimit: 60,
		transferBias: .4,
		investBias: .6,
		shares: {
			health: 16,
			education: 13,
			science: 3,
			defense: 18,
			admin: 12
		},
		desc: "Сокращает дефицит любой ценой. Усиливает рецессии, зато долг под контролем."
	},
	{
		id: "populist",
		name: "Популист",
		title: "Социальные расходы прежде всего",
		anchor: -4.5,
		cyclical: .95,
		taxWill: .75,
		debtLimit: 105,
		transferBias: 2.2,
		investBias: .9,
		shares: {
			health: 24,
			education: 17,
			science: 2,
			defense: 14,
			admin: 13
		},
		desc: "Наращивает выплаты и расходы, налоги повышает на бизнес. Источник инфляции и долга."
	}
];
const PRESIDENT_PERSONAS = [
	{
		id: "technocrat",
		name: "Технократ",
		title: "Не мешает ведомствам работать",
		pressure: .3,
		populism: -.5,
		reform: .9,
		power: .05,
		patience: 1.35,
		desc: "Вмешивается редко и по делу, вкладывается в структурные реформы, требований почти не выдвигает. Работать с ним спокойно — но и помощи ждать не стоит."
	},
	{
		id: "populist",
		name: "Популист",
		title: "Рейтинг важнее цифр",
		pressure: .85,
		populism: 1,
		reform: -.35,
		power: .35,
		patience: .7,
		desc: "Требует дешёвых денег и щедрого бюджета, реформы считает вредными для рейтинга. Отказ читает как личную нелояльность."
	},
	{
		id: "strongman",
		name: "Силовик",
		title: "Власть должна быть вертикальной",
		pressure: .9,
		populism: .25,
		reform: .15,
		power: 1,
		patience: .55,
		desc: "Указания не обсуждаются. Легко идёт на роспуск парламента и разгон протеста — вместе с ними приходят премия за риск и отток капитала."
	},
	{
		id: "reformer",
		name: "Реформатор",
		title: "Считает на два срока вперёд",
		pressure: .4,
		populism: -.4,
		reform: 1,
		power: -.2,
		patience: 1.1,
		desc: "Тратит капитал на реформы, даже когда они стоят рейтинга. Требовать будет дисциплины, а не щедрости."
	}
];
const MSK_OFFSET_MS = 108e5;
function dailyKey(date = /* @__PURE__ */ new Date()) {
	return new Date(date.getTime() + MSK_OFFSET_MS).toISOString().slice(0, 10);
}
let currentRandom = () => Math.random();
const rng = () => currentRandom();
// api/daily.js
const MAX_PLAYER_ID_LEN$1 = 64;
const MAX_NAME_LEN$1 = 24;
const TOP$1 = 50;
const ROLE_IDS = /* @__PURE__ */ new Set([
	"central_bank",
	"ministry_finance",
	"president",
	"full_control"
]);
const SCORE_IDS = [
	"stability",
	"welfare",
	"financial",
	"fiscal",
	"potential"
];
const validPlayerId$1 = (id) => typeof id === "string" && id.length > 0 && id.length <= MAX_PLAYER_ID_LEN$1;
const validDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const cleanName$1 = (v) => {
	if (typeof v !== "string") return null;
	const t = Array.from(v).filter((ch) => ch.charCodeAt(0) >= 32).join("").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LEN$1);
	return t.length ? t : null;
};
const num$1 = (v, lo, hi) => Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : null;
function openDays(now = /* @__PURE__ */ new Date()) {
	return [dailyKey(now), dailyKey(/* @__PURE__ */ new Date(now.getTime() - 864e5))];
}
function sanitizeEntry(body) {
	const score = num$1(body.score, 0, 100);
	if (score === null) return null;
	if (!ROLE_IDS.has(body.role)) return null;
	const scores = {};
	if (body.scores && typeof body.scores === "object") SCORE_IDS.forEach((k) => {
		const v = num$1(body.scores[k], 0, 100);
		if (v !== null) scores[k] = Math.round(v);
	});
	return {
		name: cleanName$1(body.name) || "Без имени",
		score: Math.round(score * 10) / 10,
		role: body.role,
		quarters: Math.round(num$1(body.quarters, 0, 12) || 0),
		defeated: !!body.defeated,
		scores,
		at: Date.now()
	};
}
function rankBoard(board) {
	return Object.entries(board || {}).map(([playerId, e]) => ({
		playerId,
		...typeof e === "string" ? JSON.parse(e) : e
	})).filter((e) => Number.isFinite(e.score)).sort((a, b) => b.score - a.score || a.at - b.at);
}
const publicRow$1 = (e, i, me) => ({
	rank: i + 1,
	name: e.name,
	score: e.score,
	role: e.role,
	quarters: e.quarters,
	defeated: e.defeated,
	scores: e.scores || {},
	you: e.playerId === me,
	verified: !!e.verified,
	emblem: e.verified ? e.emblem || "star" : null
});
function guestName(name, board, playerId) {
	return rankBoard(board).some((e) => e.verified && e.playerId !== playerId && String(e.name).toLowerCase() === String(name).toLowerCase()) ? `${name} (гость)`.slice(0, 32) : name;
}
async function handleRequest$4(req, res) {
	if (req.method === "GET") {
		const day = validDay(req.query.day) ? req.query.day : dailyKey();
		const me = validPlayerId$1(req.query.playerId) ? req.query.playerId : null;
		const ranked = rankBoard(await getDailyBoard(day));
		const rows = ranked.slice(0, TOP$1).map((e, i) => publicRow$1(e, i, me));
		const myIdx = me ? ranked.findIndex((e) => e.playerId === me) : -1;
		return res.status(200).json({
			day,
			total: ranked.length,
			rows,
			you: myIdx >= 0 ? publicRow$1(ranked[myIdx], myIdx, me) : null,
			storage: hasKv() ? "kv" : "memory"
		});
	}
	if (req.method !== "POST") return res.status(405).json({ error: "Только GET и POST" });
	let body;
	try {
		body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
	} catch {
		return res.status(400).json({ error: "Некорректный JSON" });
	}
	if (!body || typeof body !== "object") return res.status(400).json({ error: "Некорректное тело запроса" });
	const { day } = body;
	const user = body.session ? await userBySession(body.session) : null;
	const playerId = user ? user.playerId : body.playerId;
	if (!validPlayerId$1(playerId)) return res.status(400).json({ error: "Некорректный идентификатор" });
	if (!validDay(day) || !openDays().includes(day)) return res.status(400).json({ error: "Приём результатов за этот день закрыт" });
	const entry = sanitizeEntry(body);
	if (!entry) return res.status(400).json({ error: "Некорректный результат" });
	const board = await getDailyBoard(day);
	if (user) Object.assign(entry, {
		name: user.name,
		verified: true,
		emblem: user.emblem || "star"
	});
	else entry.name = guestName(entry.name, board, playerId);
	const prevRaw = board[playerId];
	const prev = prevRaw ? typeof prevRaw === "string" ? JSON.parse(prevRaw) : prevRaw : null;
	const next = prev && prev.score >= entry.score ? {
		...prev,
		name: entry.name,
		verified: entry.verified || false,
		emblem: entry.emblem
	} : entry;
	await setDailyEntry(day, playerId, next);
	const ranked = rankBoard({
		...board,
		[playerId]: next
	});
	const myIdx = ranked.findIndex((e) => e.playerId === playerId);
	return res.status(200).json({
		day,
		total: ranked.length,
		improved: next === entry,
		rows: ranked.slice(0, TOP$1).map((e, i) => publicRow$1(e, i, playerId)),
		you: publicRow$1(ranked[myIdx], myIdx, playerId)
	});
}
async function handler$4(req, res) {
	try {
		return await handleRequest$4(req, res);
	} catch (err) {
		console.error("daily handler error:", err);
		return res.status(500).json({ error: "Внутренняя ошибка сервера" });
	}
}
// api/events.js
const FUNNEL = [
	"welcome_view",
	"welcome_start",
	"goal_done",
	"first_lesson_start",
	"first_lesson_done",
	"register_done",
	"return_d1",
	"return_d7"
];
const ACTIVITY = [
	"lesson_start",
	"lesson_done",
	"lesson_quit",
	"ex_first_try_ok",
	"ex_first_try_fail"
];
const FEATURES = [
	"world_open",
	"textbook_open",
	"shop_open",
	"garden_open",
	"league_open",
	"tycoon_open",
	"network_open",
	"piggy_put",
	"wardrobe_wear",
	"rare_buy",
	"antistress_open",
	"halloween_claim"
];
const SAFETY = ["coins_guard", "coins_clawback"];
const EVENTS$1 = [
	...FUNNEL,
	...ACTIVITY,
	...FEATURES,
	...SAFETY
];
const FUNNEL_LABEL = {
	welcome_view: "Открыли приветствие",
	welcome_start: "Нажали «Начать»",
	goal_done: "Выбрали цель",
	first_lesson_start: "Начали первый урок",
	first_lesson_done: "Прошли первый урок",
	register_done: "Создали аккаунт",
	return_d1: "Вернулись на следующий день",
	return_d7: "Вернулись через неделю"
};
const FEATURE_LABEL = {
	world_open: "Мир",
	textbook_open: "Учебник",
	shop_open: "Лавка",
	garden_open: "Сад Инфли",
	league_open: "Лиги",
	tycoon_open: "Своё дело",
	network_open: "Сетевая партия",
	piggy_put: "Копилка: положили",
	wardrobe_wear: "Гардероб: надели вещь",
	rare_buy: "Ювелир: купили",
	antistress_open: "Антистресс: пользовались",
	halloween_claim: "Хеллоуин: забрали «Паутину»"
};
const ID_RE$1 = /^[a-z0-9][a-z0-9_:.-]{0,79}$/i;
const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const lastDays = (n, now = Date.now()) => Array.from({ length: n }, (_, k) => today(now - k * 864e5));
function sanitizeEvent(body) {
	if (!body || typeof body !== "object" || !EVENTS$1.includes(body.event)) return null;
	const out = { event: body.event };
	if (typeof body.lesson === "string" && ID_RE$1.test(body.lesson)) out.lesson = body.lesson;
	if (typeof body.exercise === "string" && ID_RE$1.test(body.exercise)) out.exercise = body.exercise;
	if (typeof body.ok === "boolean") out.ok = body.ok;
	if (Number.isFinite(body.ms) && body.ms >= 0 && body.ms < 36e5) out.ms = Math.round(body.ms);
	if (Number.isInteger(body.step) && body.step >= 1 && body.step <= 99) out.step = body.step;
	return out;
}
function counterKeys(e, now = Date.now()) {
	const keys = [`day:${today(now)}:${e.event}`];
	if (e.exercise && (e.event === "ex_first_try_ok" || e.event === "ex_first_try_fail")) {
		keys.push(`exercise:${e.exercise}:total`);
		if (e.event === "ex_first_try_ok") keys.push(`exercise:${e.exercise}:correct`);
	}
	if (e.lesson && (e.event === "lesson_start" || e.event === "lesson_done")) keys.push(`lesson:${e.lesson}:${e.event === "lesson_start" ? "start" : "done"}`);
	if (e.lesson && e.event === "lesson_quit") {
		keys.push(`lesson:${e.lesson}:quit`);
		if (e.step) keys.push(`lesson:${e.lesson}:quit:${e.step}`);
	}
	return keys;
}
const counterSums = (e) => e.lesson && e.event === "lesson_done" && e.ms ? [[`lesson:${e.lesson}:sec`, Math.round(e.ms / 1e3)]] : [];
const sumDays = (c, days, ev) => days.reduce((a, d) => a + (c[`day:${d}:${ev}`] || 0), 0);
async function report(now = Date.now()) {
	const days = lastDays(30, now);
	const c = await readCounters(days.flatMap((d) => EVENTS$1.map((ev) => `day:${d}:${ev}`)));
	const funnel = FUNNEL.map((ev) => ({
		event: ev,
		label: FUNNEL_LABEL[ev],
		count: sumDays(c, days, ev)
	}));
	const daily = [...days].reverse().map((d) => ({
		day: d,
		...Object.fromEntries(EVENTS$1.map((ev) => [ev, c[`day:${d}:${ev}`] || 0]))
	}));
	const week = (from) => days.slice(from, from + 7);
	const stat = (ev) => ({
		now: sumDays(c, week(0), ev),
		prev: sumDays(c, week(7), ev),
		today: sumDays(c, days.slice(0, 1), ev)
	});
	const acc = (ds) => {
		const ok = sumDays(c, ds, "ex_first_try_ok");
		const all = ok + sumDays(c, ds, "ex_first_try_fail");
		return all ? ok / all : null;
	};
	const totals = {
		lessons: stat("lesson_done"),
		starts: stat("lesson_start"),
		accounts: stat("register_done"),
		newcomers: stat("welcome_start"),
		coinsGuard: stat("coins_guard"),
		coinsClawback: stat("coins_clawback"),
		accuracy: {
			now: acc(week(0)),
			prev: acc(week(7))
		}
	};
	const features = FEATURES.map((ev) => ({
		event: ev,
		label: FEATURE_LABEL[ev],
		...stat(ev),
		month: sumDays(c, days, ev)
	}));
	const lessonIds = await setMembers("lessons");
	const QUIT_STEPS = Array.from({ length: 20 }, (_, k) => k + 1);
	const lc = await readCounters(lessonIds.flatMap((id) => [
		`lesson:${id}:start`,
		`lesson:${id}:done`,
		`lesson:${id}:sec`,
		`lesson:${id}:quit`,
		...QUIT_STEPS.map((n) => `lesson:${id}:quit:${n}`)
	]));
	const lessons = lessonIds.map((id) => {
		const start = lc[`lesson:${id}:start`] || 0;
		const done = lc[`lesson:${id}:done`] || 0;
		const sec = lc[`lesson:${id}:sec`] || 0;
		const quit = lc[`lesson:${id}:quit`] || 0;
		const worst = QUIT_STEPS.map((n) => [n, lc[`lesson:${id}:quit:${n}`] || 0]).sort((a, b) => b[1] - a[1])[0];
		return {
			id,
			start,
			done,
			finish: start ? Math.min(1, done / start) : null,
			minutes: done ? sec / done / 60 : null,
			quit,
			quitStep: worst && worst[1] ? worst[0] : null,
			quitAtStep: worst ? worst[1] : 0
		};
	}).filter((x) => x.start > 0).sort((a, b) => b.start - a.start).slice(0, 40);
	const fresh = (await getReports()).filter((r) => r.status !== "done");
	const reports = {
		fresh: fresh.length,
		byReason: fresh.reduce((m, r) => ({
			...m,
			[r.reason]: (m[r.reason] || 0) + 1
		}), {})
	};
	const ids = await setMembers("exercises");
	const ex = await readCounters(ids.flatMap((id) => [`exercise:${id}:total`, `exercise:${id}:correct`]));
	return {
		funnel,
		daily,
		totals,
		features,
		lessons,
		reports,
		hardest: ids.map((id) => {
			const total = ex[`exercise:${id}:total`] || 0;
			const correct = ex[`exercise:${id}:correct`] || 0;
			return {
				id,
				total,
				correct,
				share: total ? correct / total : 1
			};
		}).filter((x) => x.total >= 5).sort((a, b) => a.share - b.share || b.total - a.total).slice(0, 20),
		days: 30
	};
}
async function handleRequest$3(req, res) {
	if (req.method !== "POST") return res.status(405).json({ error: "Только POST" });
	let body;
	try {
		body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
	} catch {
		return res.status(400).json({ error: "Некорректный JSON" });
	}
	if (body && body.action === "report") {
		const user = await userBySession(body.session);
		if (!isOwner(user)) return res.status(403).json({ error: "Отчёт видят только владельцы" });
		return res.status(200).json({
			...await report(),
			storage: hasKv() ? "kv" : "memory"
		});
	}
	const e = sanitizeEvent(body);
	if (!e) return res.status(400).json({ error: "Неизвестное событие" });
	await bumpCounters(counterKeys(e));
	const sums = counterSums(e);
	if (sums.length) await addCounters(sums);
	if (e.exercise && e.event.startsWith("ex_first_try")) await addToSet("exercises", e.exercise);
	if (e.lesson && (e.event === "lesson_start" || e.event === "lesson_done" || e.event === "lesson_quit")) await addToSet("lessons", e.lesson);
	return res.status(200).json({ ok: true });
}
async function handler$3(req, res) {
	try {
		return await handleRequest$3(req, res);
	} catch (err) {
		console.error("events handler error:", err);
		return res.status(500).json({ error: "Внутренняя ошибка сервера" });
	}
}
// api/records.js
const KINDS = /* @__PURE__ */ new Set(["tycoon"]);
const TOP = 50;
const MAX_VALUE = 1e7;
const START_IDS = /* @__PURE__ */ new Set([
	"farm",
	"retail",
	"factory"
]);
function rankRecords(board) {
	return Object.entries(board || {}).map(([login, e]) => ({
		login,
		...typeof e === "string" ? JSON.parse(e) : e
	})).filter((e) => Number.isFinite(e.value)).sort((a, b) => b.value - a.value || a.at - b.at);
}
const publicRow = (e, i, me) => ({
	rank: i + 1,
	name: nameForOthers(e.name, e.login),
	emblem: e.emblem || "star",
	login: e.login,
	value: e.value,
	start: e.start || null,
	quarters: e.quarters || 0,
	legacy: e.legacy || 0,
	you: e.login === me
});
async function handleRequest$2(req, res) {
	const kind = String((req.method === "GET" ? req.query.kind : (req.body || {}).kind) || "tycoon");
	if (!KINDS.has(kind)) return res.status(400).json({ error: "Нет такой таблицы" });
	if (req.method === "GET") {
		const me = typeof req.query.login === "string" ? req.query.login : null;
		const ranked = rankRecords(await getRecords(kind));
		const myIdx = me ? ranked.findIndex((e) => e.login === me) : -1;
		return res.status(200).json({
			kind,
			total: ranked.length,
			rows: ranked.slice(0, TOP).map((e, i) => publicRow(e, i, me)),
			you: myIdx >= 0 ? publicRow(ranked[myIdx], myIdx, me) : null,
			storage: hasKv() ? "kv" : "memory"
		});
	}
	if (req.method !== "POST") return res.status(405).json({ error: "Только GET и POST" });
	let body;
	try {
		body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
	} catch {
		return res.status(400).json({ error: "Некорректный JSON" });
	}
	const user = await userBySession(body.session);
	if (!user) return res.status(401).json({ error: "В таблицу рекордов записывают из профиля" });
	if (isBlocked(user)) return res.status(403).json({
		error: "Аккаунт заблокирован до смены ника",
		blocked: true
	});
	const value = Number(body.value);
	if (!Number.isFinite(value) || value <= 0 || value > MAX_VALUE) return res.status(400).json({ error: "Некорректный результат" });
	const board = await getRecords(kind);
	const prevRaw = board[user.login];
	const prev = prevRaw ? typeof prevRaw === "string" ? JSON.parse(prevRaw) : prevRaw : null;
	const entry = {
		name: nameBanned(user) ? user.login : user.name,
		emblem: user.emblem || "star",
		value: Math.round(value * 10) / 10,
		start: START_IDS.has(body.start) ? body.start : null,
		quarters: Math.max(0, Math.min(1e4, Math.round(Number(body.quarters) || 0))),
		legacy: Math.max(0, Math.min(1e3, Math.round(Number(body.legacy) || 0))),
		at: Date.now()
	};
	const next = prev && prev.value >= entry.value ? {
		...prev,
		name: entry.name,
		emblem: entry.emblem
	} : entry;
	await setRecord(kind, user.login, next);
	const ranked = rankRecords({
		...board,
		[user.login]: next
	});
	const myIdx = ranked.findIndex((e) => e.login === user.login);
	return res.status(200).json({
		kind,
		total: ranked.length,
		improved: next === entry,
		rows: ranked.slice(0, TOP).map((e, i) => publicRow(e, i, user.login)),
		you: publicRow(ranked[myIdx], myIdx, user.login)
	});
}
async function handler$2(req, res) {
	try {
		return await handleRequest$2(req, res);
	} catch (err) {
		console.error("records handler error:", err);
		return res.status(500).json({ error: "Внутренняя ошибка сервера" });
	}
}
const MODULE_LESSONS = [
	"hh-i1",
	"hh-l1",
	"hh-i2",
	"hh-l2",
	"hh-w",
	"hh-s1",
	"hh-rev",
	"hh-sum"
];
const ARMS = ["game", "plain"];
const TEST_KINDS = [
	"pre",
	"post",
	"delayed"
];
const TEST_FORMS = [
	"A",
	"B",
	"C"
];
const STRATA = ["low", "high"];
const EVENT_TYPES = [
	"lesson_start",
	"lesson_done",
	"exercise_answer",
	"session_start"
];
const CLIENT_EVENT_TYPES = ["lesson_start", "session_start"];
const SERVER_FIELDS = [
	"correct",
	"active_seconds",
	"test_seconds",
	"attempt_no",
	"task_no",
	"session_no",
	"study_day"
];
const STAGES = [
	"enrolled",
	"pretest",
	"material",
	"posttest",
	"delayed"
];
const TEST_ITEMS = Array.from({ length: 12 }, (_, i) => `q${String(i + 1).padStart(2, "0")}`);
const TEST_WINDOWS = {
	pre: [0, 1],
	post: [1, 16],
	delayed: [28, 35]
};
const ID = { type: "id" };
const FIELDS = {
	participants: {
		participant_code: {
			type: "code",
			required: true,
			purpose: "Связать занятия, тесты и ответы одного участника без логина и аккаунта; по нему же участник отзывает участие."
		},
		protocol_version: {
			type: "version",
			required: true,
			purpose: "Знать, по какой версии протокола собраны данные; данные разных версий не смешиваются без отдельного решения."
		},
		consent_version: {
			type: "version",
			required: true,
			purpose: "Подтвердить, с каким текстом информации для участника он согласился."
		},
		adult_confirmed: {
			type: "bool",
			required: true,
			purpose: "Критерий включения пилота — только совершеннолетние; без подтверждения запись не принимается."
		},
		period: {
			type: "month",
			required: true,
			purpose: "Период проведения (месяц, без даты и времени) — для описания исследования и проверки, не сместились ли группы во времени."
		},
		stratum: {
			type: "enum",
			values: STRATA,
			purpose: "Слой по входному тесту, внутри которого шла рандомизация; нужен для анализа с учётом схемы распределения."
		},
		arm: {
			type: "enum",
			values: ARMS,
			purpose: "Экспериментальная группа — основное сравнение исследования."
		},
		material_version: {
			type: "version",
			purpose: "Версия учебного модуля (сборка), которую проходил участник; обе группы должны проходить одну и ту же."
		},
		stage: {
			type: "enum",
			values: STAGES,
			purpose: "Докуда дошёл участник: нужен для схемы потока участников (сколько выбыло и на каком этапе)."
		},
		used_regular_app: {
			type: "enum",
			values: [
				"no",
				"yes",
				"unsure"
			],
			purpose: "Ответ «пользовались ли вы обычной Инфляцией во время исследования» — проверка, не получила ли обычная группа игровые механики в обход схемы (смешение групп)."
		},
		form_order: {
			type: "enum",
			values: ["AB", "BA"],
			required: true,
			purpose: "Порядок параллельных форм входного и итогового тестов (A, затем B или наоборот), назначенный сервером случайно при записи, — чтобы различие форм не совпало с этапом и его можно было учесть в анализе."
		},
		enrolled_on: {
			type: "date",
			required: true,
			service: true,
			purpose: "Дата записи — без времени; служебное поле сервера: по ней считается день исследования и проверяются окна итогового и отсроченного тестов. В выгрузку не идёт, удаляется при фиксации набора."
		}
	},
	events: {
		participant_code: {
			type: "code",
			required: true,
			purpose: "Какому участнику принадлежит событие обучения."
		},
		study_day: {
			type: "int",
			min: 0,
			max: 60,
			required: true,
			purpose: "День исследования от записи (0, 1, 2…) вместо даты и времени: нужен для числа активных дней и интервала до отсроченного теста."
		},
		session_no: {
			type: "int",
			min: 1,
			max: 200,
			purpose: "Номер занятия участника — для показателя «сколько раз возвращался»."
		},
		event_type: {
			type: "enum",
			values: EVENT_TYPES,
			required: true,
			purpose: "Что произошло: начал урок, закончил урок, ответил на задание, начал занятие."
		},
		lesson_id: {
			...ID,
			purpose: "Какой урок модуля — для доли завершённых уроков и сравнения уроков между группами."
		},
		task_no: {
			type: "int",
			min: 1,
			max: 99,
			purpose: "Номер задания внутри урока — где в уроке участник ошибался или останавливался."
		},
		exercise_id: {
			...ID,
			purpose: "Какое задание (одинаково в обеих группах) — для сравнения трудности заданий."
		},
		correct: {
			type: "bool",
			purpose: "Правильность ответа на задание — считает сервер по сырому ответу и ключу модуля, не клиент."
		},
		attempt_no: {
			type: "int",
			min: 1,
			max: 99,
			purpose: "Номер попытки — для показателя «верно с первой попытки» и числа попыток; считает сервер."
		},
		active_seconds: {
			type: "int",
			min: 0,
			max: 7200,
			purpose: "Активное время на задании или уроке — продолжительность обучения; считает сервер по своим часам (промежутки между действиями, простой дольше 3 минут не входит)."
		}
	},
	tests: {
		participant_code: {
			type: "code",
			required: true,
			purpose: "Какому участнику принадлежат ответы теста."
		},
		test_kind: {
			type: "enum",
			values: TEST_KINDS,
			required: true,
			purpose: "Входной, итоговый или отсроченный тест — основа сравнения усвоения и закрепления."
		},
		form: {
			type: "enum",
			values: TEST_FORMS,
			required: true,
			purpose: "Какая параллельная форма теста — чтобы учесть различия форм по трудности."
		},
		item_id: {
			...ID,
			required: true,
			purpose: "Какая задача теста — для анализа надёжности теста и трудности задач."
		},
		correct: {
			type: "bool",
			required: true,
			purpose: "Решена ли задача теста (балл 0/1)."
		},
		study_day: {
			type: "int",
			min: 0,
			max: 60,
			required: true,
			purpose: "День исследования, когда пройден тест: проверить интервал до отсроченного теста."
		},
		test_seconds: {
			type: "int",
			min: 0,
			max: 14400,
			purpose: "Сколько длился весь тест по часам сервера — от выдачи задач до отправки: отличить попытку решения от прокликивания наугад."
		}
	}
};
Object.keys(FIELDS);
const FORBIDDEN = [
	{
		name: "login",
		aliases: ["username", "user"],
		why: "Логин указывает на аккаунт; исследование связывает данные случайным кодом участника."
	},
	{
		name: "password",
		aliases: [
			"pass",
			"hash",
			"salt",
			"recHash",
			"recSalt"
		],
		why: "Пароли и их хэши нужны только входу в аккаунт."
	},
	{
		name: "recoveryCode",
		aliases: ["recovery", "rec"],
		why: "Коды восстановления нужны только входу в аккаунт."
	},
	{
		name: "token",
		aliases: [
			"session",
			"authorization",
			"auth",
			"cookie"
		],
		why: "Токены авторизации нужны только входу в аккаунт."
	},
	{
		name: "ip",
		aliases: [
			"x-forwarded-for",
			"xForwardedFor",
			"remoteAddress"
		],
		why: "Сетевой адрес не нужен ни одному показателю исследования."
	},
	{
		name: "parentName",
		aliases: ["parent"],
		why: "Пилот — только совершеннолетние; имена родителей исследованию не нужны."
	},
	{
		name: "chat",
		aliases: [
			"messages",
			"message",
			"comment",
			"text"
		],
		why: "Переписки и свободный текст могут содержать что угодно о человеке; исследование их не анализирует."
	},
	{
		name: "friends",
		aliases: [
			"fin",
			"fout",
			"races"
		],
		why: "Социальные связи — часть обычной работы Инфляции, не исследования."
	},
	{
		name: "playerId",
		aliases: [
			"accountId",
			"userId",
			"profileId",
			"deviceId"
		],
		why: "Технический идентификатор аккаунта позволил бы соединить записи с профилем."
	},
	{
		name: "name",
		aliases: [
			"nickname",
			"nick",
			"email",
			"phone",
			"birthYear",
			"emblem"
		],
		why: "Имя, ник, контакты, год рождения и значок не нужны показателям; совершеннолетие подтверждается отдельной отметкой."
	},
	{
		name: "userAgent",
		aliases: [
			"ua",
			"device",
			"viewport"
		],
		why: "Строка браузера и размер экрана помогают узнать устройство и не входят в показатели."
	},
	{
		name: "timestamp",
		aliases: [
			"at",
			"time",
			"date",
			"createdAt"
		],
		why: "Точное время заменено днём исследования и месяцем проведения."
	}
];
const norm = (k) => String(k).toLowerCase().replace(/[-_\s]/g, "");
const FORBIDDEN_NAMES = new Map(FORBIDDEN.flatMap((f) => [f.name, ...f.aliases].map((n) => [norm(n), f.name])));
const forbiddenField = (key) => FORBIDDEN_NAMES.get(norm(key)) || null;
// src/research/module.js
const ch = (id, prompt, options, answer, why) => ({
	id,
	kind: "choice",
	prompt,
	options: options.map((text, i) => ({
		id: "абвг"[i],
		text
	})),
	answer,
	why
});
const nm = (id, prompt, answer, why, { tol = 0, unit = "крон" } = {}) => ({
	id,
	kind: "number",
	prompt,
	answer,
	tol,
	unit,
	why
});
const MODULE = [
	{
		id: "hh-i1",
		title: "Доход и расходы",
		cards: [
			"Доход — все деньги, которые приходят за выбранный период: зарплата, стипендия, подарок, проценты по вкладу. Обычно доход считают за месяц — так удобнее сравнивать с расходами, которые тоже идут помесячно.",
			"Расходы — все деньги, которые уходят за тот же период: еда, жильё, проезд, покупки.",
			"Сбережения — то, что осталось: доход минус расходы. Если расходы больше дохода, сбережения отрицательные — приходится брать в долг или тратить отложенное раньше."
		],
		exercises: [
			nm("hh-i1-a", "Тимур получает 5000 крон зарплаты и 3000 крон стипендии в месяц. Какой у него доход за месяц?", 8e3, "5000 + 3000 = 8000: доход — все деньги, которые приходят."),
			nm("hh-i1-b", "Доход Маши — 30 000 крон в месяц, расходы — 26 500. Сколько она сберегает за месяц?", 3500, "Сбережения = доход − расходы = 30 000 − 26 500 = 3500."),
			ch("hh-i1-c", "Что из этого — доход семьи?", [
				"Проценты, которые банк начислил на вклад",
				"Плата за квартиру",
				"Покупка продуктов",
				"Взнос за телефон"
			], "а", "Проценты приходят на счёт — это доход; остальное уходит — это расходы."),
			nm("hh-i1-d", "Доход Гриши — 40 000 крон, расходы — 43 000. Чему равны его сбережения за месяц?", -3e3, "40 000 − 43 000 = −3000: расходы больше дохода, сбережения отрицательные.")
		]
	},
	{
		id: "hh-l1",
		title: "Обязательные и необязательные расходы",
		cards: [
			"Обязательные расходы — без них не обойтись: жильё, еда, лекарства, проезд до работы или учёбы.",
			"Необязательные — желательные, но их можно отложить или отменить: кафе, развлечения, вещи на замену ещё рабочих.",
			"Когда денег не хватает, режут сначала необязательные расходы: так сбережения растут, а жизнь не ломается."
		],
		exercises: [
			ch("hh-l1-a", "Какой расход обязательный?", [
				"Плата за квартиру",
				"Новый телевизор при работающем старом",
				"Ужин в ресторане",
				"Билет в кино"
			], "а", "Без жилья не обойтись; остальное можно отложить."),
			ch("hh-l1-b", "Какой расход необязательный?", [
				"Лекарства для дочери",
				"Проезд до работы",
				"Поездка на море",
				"Еда на неделю"
			], "в", "Поездку можно перенести; лекарства, проезд и еда нужны."),
			nm("hh-l1-c", "Гриша тратит 44 000 в месяц, из них 9000 — необязательные. Сколько он будет тратить, если откажется от всех необязательных?", 35e3, "44 000 − 9000 = 35 000."),
			nm("hh-l1-d", "Доход Гриши — 40 000. На сколько крон в месяц станут его сбережения, если он тратит 35 000?", 5e3, "40 000 − 35 000 = 5000.")
		]
	},
	{
		id: "hh-i2",
		title: "Вклад и процент",
		cards: [
			"Вклад — деньги, которые вы отдаёте банку на время. За это банк платит процент: под 10% годовых он добавит за год десятую часть суммы.",
			"Копилка процентов не платит: сколько положили, столько и лежит.",
			"Сумма через год = вклад × (1 + ставка). 10 000 под 10% → 10 000 × 1,1 = 11 000."
		],
		exercises: [
			nm("hh-i2-a", "На вклад положили 10 000 крон под 10% годовых. Сколько будет через год?", 11e3, "10 000 × 1,1 = 11 000."),
			nm("hh-i2-b", "Сколько крон банк начислит за год на 20 000 под 5% годовых?", 1e3, "5% от 20 000 = 0,05 × 20 000 = 1000."),
			ch("hh-i2-c", "Где через год окажется больше денег — при той же сумме?", [
				"В копилке",
				"На вкладе под 6% годовых",
				"Одинаково",
				"Зависит от цвета копилки"
			], "б", "Вклад добавит 6%, копилка — ничего."),
			nm("hh-i2-d", "15 000 крон положили под 8% годовых. Сколько будет через год?", 16200, "15 000 × 1,08 = 16 200.")
		]
	},
	{
		id: "hh-l2",
		title: "Процент на процент",
		cards: [
			"Если проценты не снимать, а оставлять на вкладе, на следующий год процент начисляется уже на большую сумму — и на прошлые проценты тоже.",
			"10 000 под 10%: через год 11 000, через два — 11 000 × 1,1 = 12 100. Второй год принёс 1100, а не 1000.",
			"Поэтому вклад растёт с каждым годом на всё большую сумму — и тем быстрее, чем дольше лежат деньги."
		],
		exercises: [
			nm("hh-l2-a", "10 000 крон под 10% годовых, проценты остаются на вкладе. Сколько будет через 2 года?", 12100, "10 000 × 1,1 × 1,1 = 12 100."),
			nm("hh-l2-b", "Сколько процентов (в кронах) принёс второй год в предыдущей задаче?", 1100, "12 100 − 11 000 = 1100: процент начислен и на 1000 прошлых процентов."),
			ch("hh-l2-c", "Почему второй год принёс больше первого?", [
				"Банк поднял ставку",
				"Процент начислен и на прошлые проценты",
				"Так решила инфляция",
				"Это ошибка банка"
			], "б", "Это и есть процент на процент."),
			nm("hh-l2-d", "20 000 крон под 5% годовых, проценты остаются. Сколько будет через 2 года?", 22050, "20 000 × 1,05 × 1,05 = 22 050.")
		]
	},
	{
		id: "hh-w",
		title: "Слова юнита",
		cards: [
			"Доход — все деньги, которые приходят за период. Расходы — все деньги, которые уходят за тот же период.",
			"Бюджет — план доходов и расходов на период. Сбережения — доход минус расходы.",
			"Подушка безопасности — запас на несколько месяцев обязательных расходов на случай, если доход пропадёт."
		],
		exercises: [
			ch("hh-w-a", "Что такое бюджет семьи?", [
				"План доходов и расходов на период",
				"Все деньги на счёте",
				"Долг перед банком",
				"Стоимость квартиры"
			], "а", "Бюджет — именно план."),
			ch("hh-w-b", "Сбережения — это…", [
				"Все деньги, которые пришли",
				"Доход минус расходы",
				"Только деньги на вкладе",
				"Зарплата за год"
			], "б", "Сбережения — разница дохода и расходов."),
			ch("hh-w-c", "Подушка безопасности — это…", [
				"Новая подушка для дивана",
				"Кредит на крупную покупку",
				"Запас на несколько месяцев обязательных расходов",
				"Проценты по вкладу"
			], "в", "Она защищает, если доход пропадёт."),
			nm("hh-w-d", "Обязательные расходы семьи — 25 000 крон в месяц. Сколько нужно в подушке безопасности на 3 месяца?", 75e3, "25 000 × 3 = 75 000.")
		]
	},
	{
		id: "hh-s1",
		title: "История: накопить на телефон",
		cards: [
			"Тимур хочет телефон за 6300 крон. Он откладывает 700 крон в месяц.",
			"Если отказаться от части кафе, можно откладывать больше — и накопить быстрее.",
			"Считаем целые месяцы: если сумма не делится нацело, нужен ещё один месяц — за неполный месяц деньги не придут."
		],
		exercises: [
			nm("hh-s1-a", "Тимур откладывает 700 крон в месяц. Сколько месяцев нужно, чтобы накопить 6300?", 9, "6300 ÷ 700 = 9 месяцев.", { unit: "мес." }),
			nm("hh-s1-b", "Он стал тратить на кафе на 600 крон в месяц меньше и откладывает 1300. Сколько полных месяцев нужно на 6300? Если не делится нацело, округлите вверх.", 5, "6300 ÷ 1300 ≈ 4,85 → нужен 5-й месяц: за четыре накопится только 5200.", { unit: "мес." }),
			nm("hh-s1-c", "На сколько месяцев раньше он купит телефон?", 4, "9 − 5 = 4 месяца.", { unit: "мес." }),
			ch("hh-s1-d", "Что быстрее всего приблизило покупку?", [
				"Отказ от части необязательных расходов",
				"Отказ от проезда",
				"Покупка второго телефона",
				"Ожидание скидки на кафе"
			], "а", "Сократили необязательные расходы — сбережения выросли.")
		]
	},
	{
		id: "hh-rev",
		title: "Повторение",
		cards: [
			"Сбережения = доход − расходы. Резать сначала — необязательные расходы.",
			"Вклад × (1 + ставка) — сумма через год; если проценты остаются, через два года — × (1 + ставка) ещё раз.",
			"Если цены растут, деньги дома дешевеют: на ту же сумму можно купить меньше."
		],
		exercises: [
			nm("hh-rev-a", "Доход — 36 000, расходы — 31 500. Сколько сбережений за месяц?", 4500, "36 000 − 31 500 = 4500."),
			nm("hh-rev-b", "12 000 крон под 10% годовых, проценты остаются. Сколько через 2 года?", 14520, "12 000 × 1,1 × 1,1 = 14 520."),
			ch("hh-rev-c", "Цены за год выросли на 7%, а деньги год лежали дома. Что с ними?", [
				"На них можно купить меньше",
				"На них можно купить больше",
				"Ничего не изменилось",
				"Их стало больше"
			], "а", "Сумма та же, а цены выше — покупательная способность упала."),
			nm("hh-rev-d", "Вклад приносит 9% годовых, цены выросли на 5%. Примерно на сколько процентов выросло то, что можно купить на эти деньги?", 4, "Примерно 9 − 5 = 4%.", {
				unit: "%",
				tol: .5
			})
		]
	},
	{
		id: "hh-sum",
		title: "Итог юнита",
		cards: [
			"Знать свой доход и расходы — первый шаг: тогда видно, сколько можно откладывать.",
			"Подушка безопасности защищает от неожиданностей, вклад с процентом на процент — растит сбережения.",
			"Инфляция съедает деньги, лежащие без дела: сравнивайте ставку вклада с ростом цен."
		],
		exercises: [
			nm("hh-sum-a", "Доход — 50 000 крон в месяц, вы откладываете 7500. Какую долю дохода вы сберегаете, в процентах?", 15, "7500 ÷ 50 000 = 0,15 = 15%.", {
				unit: "%",
				tol: .1
			}),
			ch("hh-sum-b", "С чего разумнее начать, если сбережений нет совсем?", [
				"С подушки безопасности",
				"С покупки дорогого телефона в кредит",
				"С отказа от еды",
				"Ни с чего: копить бесполезно"
			], "а", "Сначала — запас на непредвиденное."),
			nm("hh-sum-c", "Расходы — 28 000 в месяц. Сколько в подушке на 4 месяца?", 112e3, "28 000 × 4 = 112 000."),
			ch("hh-sum-d", "Вклад под 4% годовых, цены растут на 6%. Что происходит со сбережениями на вкладе?", [
				"Покупательная способность растёт",
				"Покупательная способность падает",
				"Ничего не меняется",
				"Удваивается"
			], "б", "Ставка ниже роста цен: на деньги с процентами можно купить меньше, чем раньше.")
		]
	}
];
const MODULE_BY_LESSON = Object.fromEntries(MODULE.map((l) => [l.id, l]));
const EXERCISE_INDEX = Object.fromEntries(MODULE.flatMap((l) => l.exercises.map((e, i) => [e.id, {
	lesson_id: l.id,
	task_no: i + 1,
	ex: e
}])));
function parseAnswerNumber(raw) {
	if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
	if (typeof raw !== "string") return null;
	const s = raw.replace(/[\s ]/g, "").replace(/(%|[а-яё]+\.?)+$/i, "").replace(",", ".").replace("−", "-");
	return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
function checkModuleAnswer(exerciseId, answer) {
	const hit = EXERCISE_INDEX[exerciseId];
	if (!hit) return null;
	const { ex } = hit;
	if (ex.kind === "choice") return typeof answer === "string" && answer.trim().toLowerCase() === ex.answer;
	const v = parseAnswerNumber(answer);
	return v != null && Math.abs(v - ex.answer) <= (ex.tol || 0) + 1e-9;
}
// api/_lib/research-key.js
const F = {
	A: {
		I: 42e3,
		E: 35500,
		s: 1500,
		T: 9800,
		P: 2e4,
		r: 8,
		E2: 27e3,
		m: 3,
		rr: 9,
		pi: 6,
		d: 6,
		I2: 5e4,
		s2: 6e3
	},
	B: {
		I: 38e3,
		E: 31200,
		s: 1200,
		T: 8500,
		P: 15e3,
		r: 10,
		E2: 24e3,
		m: 4,
		rr: 7,
		pi: 4,
		d: 8,
		I2: 4e4,
		s2: 5e3
	},
	C: {
		I: 46e3,
		E: 39800,
		s: 1800,
		T: 11500,
		P: 3e4,
		r: 6,
		E2: 31e3,
		m: 3,
		rr: 11,
		pi: 7,
		d: 9,
		I2: 6e4,
		s2: 9e3
	}
};
const kr = (x) => `${String(x).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} крон`;
const PERMS = [
	[
		0,
		1,
		2,
		3
	],
	[
		2,
		0,
		3,
		1
	],
	[
		1,
		3,
		0,
		2
	],
	[
		3,
		2,
		1,
		0
	]
];
const FORM_SHIFT = {
	A: 0,
	B: 1,
	C: 2
};
const LETTERS = [
	"а",
	"б",
	"в",
	"г"
];
function choice(form, k, prompt, right, wrong) {
	const all = [right, ...wrong];
	const opts = PERMS[(FORM_SHIFT[form] + k) % PERMS.length].map((i) => all[i]);
	return {
		kind: "choice",
		prompt,
		options: opts.map((text, i) => ({
			id: LETTERS[i],
			text
		})),
		answer: LETTERS[opts.indexOf(right)]
	};
}
const num = (prompt, answer, tol = 0, unit = "") => ({
	kind: "number",
	prompt,
	answer,
	tol,
	unit
});
const TEMPLATES = {
	q01: (v) => num(`Доход семьи за месяц — ${kr(v.I)}, расходы — ${kr(v.E)}. Сколько крон семья сберегает за месяц?`, v.I - v.E, 0, "крон"),
	q02: (v) => num(`Вы откладываете по ${kr(v.s)} в месяц. Сколько полных месяцев нужно, чтобы накопить ${kr(v.T)}? Ответ — целое число месяцев (если не делится нацело, округлите вверх).`, Math.ceil(v.T / v.s), 0, "мес."),
	q03: (v, f) => choice(f, 0, "Что такое бюджет семьи?", "План доходов и расходов на период", [
		"Все деньги, которые семья получила за месяц",
		"Деньги, отложенные на крупную покупку",
		"Долг семьи перед банком"
	]),
	q04: (v) => num(`На вклад положили ${kr(v.P)} под ${v.r}% годовых. Сколько крон будет на вкладе через год?`, Math.round(v.P * (1 + v.r / 100)), 0, "крон"),
	q05: (v) => num(`На вклад положили ${kr(v.P)} под ${v.r}% годовых; проценты остаются на вкладе. Сколько крон будет через 2 года? Округлите до целых.`, Math.round(v.P * (1 + v.r / 100) ** 2), 1, "крон"),
	q06: (v) => num(`${kr(v.P)} лежат год в копилке, столько же — год на вкладе под ${v.r}% годовых. На сколько крон больше окажется на вкладе?`, Math.round(v.P * v.r / 100), 0, "крон"),
	q07: (v, f) => choice(f, 1, "Какой из этих расходов — обязательный?", "Плата за квартиру", [
		"Новый телефон при работающем старом",
		"Ужин в ресторане по выходным",
		"Подписка на второй видеосервис"
	]),
	q08: (v) => num(`Расходы семьи — ${kr(v.E2)} в месяц. Сколько крон должно быть в подушке безопасности на ${v.m} месяца расходов?`, v.E2 * v.m, 0, "крон"),
	q09: (v) => num(`Вклад приносит ${v.rr}% годовых, цены за год выросли на ${v.pi}%. Примерно на сколько процентов за год выросло то, что можно купить на эти деньги?`, v.rr - v.pi, .5, "%"),
	q10: (v, f) => choice(f, 2, "Почему вклад, проценты с которого остаются на нём, с каждым годом растёт на всё большую сумму?", "Проценты начисляются и на прошлые проценты", [
		"Банк каждый год повышает ставку",
		"Инфляция увеличивает сумму вклада",
		"Так растёт любая сумма в копилке"
	]),
	q11: (v) => num(`Доход — ${kr(v.I2)} в месяц, из них вы откладываете ${kr(v.s2)}. Какую долю дохода вы сберегаете, в процентах?`, Math.round(v.s2 / v.I2 * 1e3) / 10, .1, "%"),
	q12: (v, f) => choice(f, 3, `Цены растут на ${v.d}% в год. Что произойдёт с деньгами, если год держать их дома, а не на вкладе под ${v.d + 2}%?`, "На них можно будет купить меньше, чем сейчас", [
		"На них можно будет купить столько же",
		"Их станет больше",
		"Они полностью обесценятся"
	])
};
const KEY_ITEMS = Object.keys(TEMPLATES);
const KEY_FORMS = Object.keys(F);
const build = (form) => Object.fromEntries(KEY_ITEMS.map((id) => [id, TEMPLATES[id](F[form], form)]));
const BANK = Object.fromEntries(KEY_FORMS.map((f) => [f, build(f)]));
function publicForm(form) {
	const b = BANK[form];
	if (!b) return null;
	return KEY_ITEMS.map((id) => {
		const it = b[id];
		return it.kind === "choice" ? {
			item_id: id,
			kind: "choice",
			prompt: it.prompt,
			options: it.options
		} : {
			item_id: id,
			kind: "number",
			prompt: it.prompt,
			unit: it.unit
		};
	});
}
const parseNumber = parseAnswerNumber;
function scoreItem(form, itemId, answer) {
	const it = BANK[form] && BANK[form][itemId];
	if (!it) return null;
	if (it.kind === "choice") return typeof answer === "string" && answer.trim().toLowerCase() === it.answer;
	const v = parseNumber(answer);
	return v != null && Math.abs(v - it.answer) <= it.tol + 1e-9;
}
const answerOk = (raw) => typeof raw === "string" && raw.length <= 24 || typeof raw === "number" && Number.isFinite(raw) || raw == null;
// src/research/record.js
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const A = 31;
const check = (body) => CODE_ALPHABET[[...body].reduce((sum, ch, i) => (sum + (i + 1) * CODE_ALPHABET.indexOf(ch)) % A, 0)];
const cryptoInt = (n) => {
	const max = Math.floor(4294967296 / n) * n;
	const buf = /* @__PURE__ */ new Uint32Array(1);
	for (;;) {
		globalThis.crypto.getRandomValues(buf);
		if (buf[0] < max) return buf[0] % n;
	}
};
function participantCode(randomInt = cryptoInt) {
	const body = Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(A)]).join("");
	const c = body + check(body);
	return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}
function normalizeCode(s) {
	const raw = String(s || "").toUpperCase().replace(/[\s-]/g, "");
	if (raw.length !== 11 || [...raw].some((ch) => !"ABCDEFGHJKMNPQRSTUVWXYZ23456789".includes(ch))) return null;
	if (check(raw.slice(0, 10)) !== raw[10]) return null;
	return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}
function exportRecord(table, rec) {
	const spec = FIELDS[table] || {};
	return Object.fromEntries(Object.entries(rec || {}).filter(([k]) => spec[k] && !spec[k].service));
}
const isParticipantCode = (s) => typeof s === "string" && normalizeCode(s) === s;
const ID_RE = /^[a-z0-9][a-z0-9_:.-]{0,79}$/i;
const VERSION_RE$1 = /^[a-z0-9][a-z0-9._-]{0,39}$/i;
const MONTH_RE = /^20\d\d-(0[1-9]|1[0-2])$/;
const DATE_RE = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
function valid(spec, v) {
	switch (spec.type) {
		case "code": return isParticipantCode(v);
		case "enum": return spec.values.includes(v);
		case "int": return Number.isInteger(v) && v >= spec.min && v <= spec.max;
		case "bool": return typeof v === "boolean";
		case "id": return typeof v === "string" && ID_RE.test(v);
		case "version": return typeof v === "string" && VERSION_RE$1.test(v);
		case "month": return typeof v === "string" && MONTH_RE.test(v);
		case "date": return typeof v === "string" && DATE_RE.test(v);
		default: return false;
	}
}
function cleanRecord(table, raw) {
	const spec = FIELDS[table];
	if (!spec) return { error: `нет таблицы ${table}` };
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "запись — не объект" };
	const bad = Object.keys(raw).map(forbiddenField).find(Boolean);
	if (bad) return { error: `запрещённое поле: ${bad}` };
	const record = {};
	const dropped = [];
	for (const [k, v] of Object.entries(raw)) {
		if (!spec[k]) {
			dropped.push(k);
			continue;
		}
		if (v === void 0 || v === null) continue;
		if (!valid(spec[k], v)) return { error: `неверное значение поля ${k}` };
		record[k] = v;
	}
	const missing = Object.entries(spec).find(([k, f]) => f.required && !(k in record));
	if (missing) return { error: `нет обязательного поля ${missing[0]}` };
	return {
		record,
		dropped
	};
}
// src/research/randomize.js
function seededRandom(seed) {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 >>> 0;
		let t = a;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
const bigStickNext = (d, rnd, mti = 3) => d >= mti ? "plain" : d <= -mti ? "game" : rnd() < .5 ? "game" : "plain";
const strataSeed = (seed, stratum) => [...`${seed}:${stratum}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
function allocationSequence(seed, stratum, n) {
	if (!STRATA.includes(stratum)) throw new Error(`нет слоя ${stratum}`);
	const rnd = seededRandom(strataSeed(seed, stratum));
	const out = [];
	let d = 0;
	while (out.length < n) {
		const arm = bigStickNext(d, rnd);
		out.push(arm);
		d += arm === "game" ? 1 : -1;
	}
	return out;
}
const armAt = (seed, stratum, index) => allocationSequence(seed, stratum, index + 1)[index];
const stratumOf = (correct, total, cut = .5) => total > 0 && correct / total >= cut ? "high" : "low";
// api/_lib/research-store.js
let redis = null;
try {
	const url = process.env.RESEARCH_KV_REST_API_URL;
	const token = process.env.RESEARCH_KV_REST_API_TOKEN;
	if (url && token && url !== process.env.KV_REST_API_URL) {
		const { Redis } = await Promise.resolve().then(() => (init_nodejs(), nodejs_exports));
		redis = new Redis({
			url,
			token
		});
	}
} catch {
	redis = null;
}
function memoryStore() {
	const m = /* @__PURE__ */ new Map();
	return {
		kind: "memory",
		get: async (k) => {
			if (!m.has(k)) return null;
			const v = m.get(k);
			if (v && v.__until) return v.__until < Date.now() ? null : structuredClone(v.v);
			return structuredClone(v);
		},
		set: async (k, v) => {
			m.set(k, structuredClone(v));
			return true;
		},
		setNx: async (k, v, ttl = 0) => {
			const cur = m.get(k);
			if (cur !== void 0 && !(cur && cur.__until && cur.__until < Date.now())) return false;
			m.set(k, ttl ? {
				__until: Date.now() + ttl * 1e3,
				v: structuredClone(v)
			} : structuredClone(v));
			return true;
		},
		del: async (...ks) => {
			ks.forEach((k) => m.delete(k));
			return true;
		},
		incr: async (k) => {
			const v = (m.get(k) || 0) + 1;
			m.set(k, v);
			return v;
		},
		incrBy: async (k, n) => {
			const v = (m.get(k) || 0) + n;
			m.set(k, v);
			return v;
		},
		setEx: async (k, v, ttl) => {
			m.set(k, {
				__until: Date.now() + ttl * 1e3,
				v: structuredClone(v)
			});
			return true;
		},
		push: async (k, v) => {
			const list = m.get(k) || [];
			list.push(structuredClone(v));
			m.set(k, list);
			return list.length;
		},
		list: async (k) => structuredClone(m.get(k) || []),
		keys: async (prefix) => [...m.keys()].filter((k) => k.startsWith(prefix))
	};
}
function redisStore(r) {
	return {
		kind: "redis",
		get: (k) => r.get(k),
		set: (k, v) => r.set(k, v),
		setNx: async (k, v, ttl = 0) => await r.set(k, v, ttl ? {
			nx: true,
			ex: ttl
		} : { nx: true }) === "OK",
		del: (...ks) => r.del(...ks),
		incr: (k) => r.incr(k),
		incrBy: (k, n) => r.incrby(k, n),
		setEx: (k, v, ttl) => r.set(k, v, { ex: ttl }),
		push: (k, v) => r.rpush(k, v),
		list: async (k) => await r.lrange(k, 0, -1) || [],
		keys: async (prefix) => {
			const out = [];
			let cursor = 0;
			do {
				const [next, ks] = await r.scan(cursor, {
					match: `${prefix}*`,
					count: 500
				});
				out.push(...ks);
				cursor = Number(next);
			} while (cursor !== 0);
			return out;
		}
	};
}
let mem = null;
function researchStore() {
	if (redis) return redisStore(redis);
	if (!mem) mem = memoryStore();
	return mem;
}
const STAGE_ORDER = [
	"enrolled",
	"pretest",
	"material",
	"posttest",
	"delayed"
];
const PURGE_PHRASE = "УДАЛИТЬ НАБОР";
const PURGE_PREFIXES = [
	"rp:",
	"re:",
	"rt:",
	"rx:",
	"rslot:",
	"rlock:",
	"rcount:",
	"rday:",
	"rwithdrawn"
];
const ISSUE_SECONDS = 14400;
const LAST_SECONDS = 1800;
const VERSION_RE = /^[a-z0-9][a-z0-9._-]{0,39}$/i;
const month = (now) => new Date(now).toISOString().slice(0, 7);
const day = (now) => new Date(now).toISOString().slice(0, 10);
const studyDay = (p, now) => Math.max(0, Math.round((Date.parse(day(now)) - Date.parse(p.enrolled_on)) / 864e5));
const formFor = (p, kind) => kind === "delayed" ? "C" : kind === "pre" ? p.form_order[0] : p.form_order[1];
const advance = (p, stage) => STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(p.stage) ? {
	...p,
	stage
} : p;
const sameToken = (a, b) => {
	const x = Buffer.from(String(a || ""));
	const y = Buffer.from(String(b || ""));
	return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};
function makeHandler({ status, store, seed = null, exportToken = "", now = () => Date.now(), newCode = participantCode, coin = () => globalThis.crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(1))[0] < 128 }) {
	const open = () => status === "open" && seed != null && seed !== "";
	async function loadParticipant(code) {
		const c = normalizeCode(code);
		if (!c) return {
			error: "Код участника не распознан",
			status: 400
		};
		const p = await store().get(`rp:${c}`);
		if (!p) return {
			error: "Участник не найден",
			status: 404
		};
		return {
			p,
			code: c
		};
	}
	const rx = (code, k) => `rx:${code}:${k}`;
	const lessonsDone = async (code) => {
		const out = [];
		for (const id of MODULE_LESSONS) if (await store().get(rx(code, `done:${id}`)) != null) out.push(id);
		return out;
	};
	async function testAllowed(p, code, kind) {
		if (!TEST_WINDOWS[kind]) return {
			error: "Тест не распознан",
			status: 400
		};
		const d = studyDay(p, now());
		const [from, to] = TEST_WINDOWS[kind];
		if (d < from || d > to) return {
			error: `Тест вне своего окна: день ${d}, окно ${from}–${to}`,
			status: 409
		};
		if (kind === "pre" && p.arm) return {
			error: "Входной тест уже пройден",
			status: 409
		};
		if (kind !== "pre" && !p.arm) return {
			error: "Сначала входной тест",
			status: 409
		};
		if (kind === "post" && d < 14) {
			const done = await lessonsDone(code);
			if (done.length < MODULE_LESSONS.length) return {
				error: `Итоговый тест — после всех ${MODULE_LESSONS.length} уроков модуля или с 14-го дня: пройдено ${done.length}`,
				status: 409
			};
		}
		return { day: d };
	}
	async function checkTest(p, code, kind, form, items) {
		const ok = await testAllowed(p, code, kind);
		if (ok.error) return ok;
		if (form !== formFor(p, kind)) return {
			error: `Форма теста не та: ждали ${formFor(p, kind)}`,
			status: 400
		};
		if (!Array.isArray(items) || items.length !== TEST_ITEMS.length) return {
			error: `В тесте должно быть ${TEST_ITEMS.length} задач`,
			status: 400
		};
		const ids = items.map((it) => it && it.item_id);
		if (new Set(ids).size !== ids.length || TEST_ITEMS.some((id) => !ids.includes(id))) return {
			error: "Задачи теста не совпадают с банком",
			status: 400
		};
		if (items.some((it) => SERVER_FIELDS.some((f) => f in it))) return {
			error: "Правильность и время теста считает сервер — клиент присылает только ответы",
			status: 400
		};
		if (items.some((it) => !answerOk(it.answer))) return {
			error: "Ответ не распознан",
			status: 400
		};
		const issued = await store().get(rx(code, `issue:${kind}`));
		if (issued == null) return {
			error: "Сначала получите задачи теста",
			status: 409
		};
		const secs = Math.max(0, Math.min(14400, Math.round((now() - issued) / 1e3)));
		const rows = [];
		for (const it of items) {
			const { record, error } = cleanRecord("tests", {
				participant_code: p.participant_code,
				test_kind: kind,
				form,
				item_id: it.item_id,
				correct: scoreItem(form, it.item_id, it.answer) === true,
				study_day: ok.day,
				test_seconds: secs
			});
			if (error) return {
				error,
				status: 400
			};
			rows.push(record);
		}
		return { rows };
	}
	async function tick(code) {
		const t = now();
		const last = await store().get(rx(code, "last"));
		await store().setEx(rx(code, "last"), t, LAST_SECONDS);
		return last == null ? 0 : Math.max(0, Math.min(180, Math.round((t - last) / 1e3)));
	}
	const actions = {
		status: async () => ({
			status: open() ? "open" : "not-started",
			protocol: "0.3",
			consent: "0.3"
		}),
		enroll: async (b) => {
			if (b.adult !== true) return {
				error: "В пилоте участвуют только совершеннолетние",
				status: 400
			};
			if (b.consent !== "0.3") return {
				error: "Нужно согласие с текущей версией информации для участника",
				status: 400
			};
			const t = now();
			if (await store().incr(`rday:${day(t)}`) > 300) return {
				error: "Запись на сегодня закрыта",
				status: 429
			};
			const code = newCode();
			const p = {
				participant_code: code,
				protocol_version: "0.3",
				consent_version: "0.3",
				adult_confirmed: true,
				period: month(t),
				stage: "enrolled",
				form_order: coin() ? "AB" : "BA",
				enrolled_on: day(t)
			};
			if (cleanRecord("participants", p).error) return {
				error: "Запись не прошла проверку",
				status: 500
			};
			if (!await store().setNx(`rp:${code}`, p)) return {
				error: "Код уже занят — попробуйте ещё раз",
				status: 409
			};
			return {
				code,
				forms: {
					pre: formFor(p, "pre"),
					post: formFor(p, "post"),
					delayed: "C"
				}
			};
		},
		form: async (b) => {
			const got = await loadParticipant(b.code);
			if (got.error) return got;
			const ok = await testAllowed(got.p, got.code, b.kind);
			if (ok.error) return ok;
			if (await store().get(`rt:${got.code}:${b.kind}`) && got.p.arm) return {
				error: "Этот тест уже пройден",
				status: 409
			};
			await store().setNx(rx(got.code, `issue:${b.kind}`), now(), ISSUE_SECONDS);
			const form = formFor(got.p, b.kind);
			return {
				kind: b.kind,
				form,
				items: publicForm(form)
			};
		},
		pretest: async (b) => {
			const got = await loadParticipant(b.code);
			if (got.error) return got;
			if (got.p.arm) return {
				error: "Входной тест уже пройден",
				status: 409
			};
			if (!await store().setNx(`rlock:${got.code}`, 1, 30)) return {
				error: "Входной тест уже отправляется",
				status: 409
			};
			try {
				const p0 = await store().get(`rp:${got.code}`);
				if (!p0 || p0.arm) return {
					error: "Входной тест уже пройден",
					status: 409
				};
				let rows = await store().get(`rt:${got.code}:pre`);
				if (!rows) {
					const checked = await checkTest(p0, got.code, "pre", b.form, b.items);
					if (checked.error) return checked;
					rows = checked.rows;
					if (!await store().setNx(`rt:${got.code}:pre`, rows)) rows = await store().get(`rt:${got.code}:pre`);
					await store().del(rx(got.code, "issue:pre"));
				}
				const stratum = stratumOf(rows.filter((r) => r.correct).length, rows.length);
				let slot = await store().get(`rslot:${got.code}`);
				if (slot == null) {
					const n = await store().incr(`rcount:${stratum}`);
					if (!await store().setNx(`rslot:${got.code}`, n - 1)) slot = await store().get(`rslot:${got.code}`);
					else slot = n - 1;
				}
				const arm = armAt(seed, stratum, slot);
				const mv = typeof b.material_version === "string" && VERSION_RE.test(b.material_version) ? b.material_version : void 0;
				await store().set(`rp:${got.code}`, advance({
					...p0,
					stratum,
					arm,
					...mv ? { material_version: mv } : {}
				}, "pretest"));
				return { arm };
			} finally {
				await store().del(`rlock:${got.code}`);
			}
		},
		event: async (b) => {
			const got = await loadParticipant(b.code);
			if (got.error) return got;
			if (!got.p.arm) return {
				error: "Сначала входной тест",
				status: 409
			};
			const d = studyDay(got.p, now());
			if (d > 35) return {
				error: "Исследование для участника закончилось",
				status: 409
			};
			const raw = b.event && typeof b.event === "object" && !Array.isArray(b.event) ? b.event : {};
			const bad = Object.keys(raw).map(forbiddenField).find(Boolean);
			if (bad) return {
				error: `запрещённое поле: ${bad}`,
				status: 400
			};
			if (SERVER_FIELDS.some((f) => f in raw)) return {
				error: "Это поле события ставит сервер",
				status: 400
			};
			if (!CLIENT_EVENT_TYPES.includes(raw.event_type)) return {
				error: "Это событие пишет сервер: ответ на задание — действием «answer», «урок пройден» — сам по ответам",
				status: 400
			};
			if (raw.event_type === "lesson_start" && !MODULE_LESSONS.includes(raw.lesson_id)) return {
				error: "Урок не из модуля исследования",
				status: 400
			};
			const extra = raw.event_type === "session_start" ? { session_no: Math.min(200, await store().incr(rx(got.code, "sess"))) } : { lesson_id: raw.lesson_id };
			await tick(got.code);
			const { record, error } = cleanRecord("events", {
				participant_code: got.code,
				study_day: d,
				event_type: raw.event_type,
				...extra
			});
			if (error) return {
				error,
				status: 400
			};
			if (await store().push(`re:${got.code}`, record) > 3e3) return {
				error: "Слишком много событий",
				status: 429
			};
			if (got.p.stage === "pretest") await store().set(`rp:${got.code}`, advance(got.p, "material"));
			return { ok: true };
		},
		answer: async (b) => {
			const got = await loadParticipant(b.code);
			if (got.error) return got;
			if (!got.p.arm) return {
				error: "Сначала входной тест",
				status: 409
			};
			const d = studyDay(got.p, now());
			if (d > 35) return {
				error: "Исследование для участника закончилось",
				status: 409
			};
			if (SERVER_FIELDS.some((f) => f in b)) return {
				error: "Правильность, попытку и время ставит сервер",
				status: 400
			};
			const hit = EXERCISE_INDEX[b.exercise_id];
			if (!hit) return {
				error: "Задание не из модуля исследования",
				status: 400
			};
			if (!answerOk(b.answer) || b.answer == null || b.answer === "") return {
				error: "Ответ не распознан",
				status: 400
			};
			const code = got.code;
			const lesson = hit.lesson_id;
			const correct = checkModuleAnswer(b.exercise_id, b.answer) === true;
			const attempt = await store().incr(rx(code, `att:${b.exercise_id}`));
			const secs = await tick(code);
			await store().incrBy(rx(code, `sec:${lesson}`), secs);
			const { record, error } = cleanRecord("events", {
				participant_code: code,
				study_day: d,
				event_type: "exercise_answer",
				lesson_id: lesson,
				task_no: hit.task_no,
				exercise_id: b.exercise_id,
				correct,
				attempt_no: Math.min(99, attempt),
				active_seconds: secs
			});
			if (error) return {
				error,
				status: 400
			};
			if (await store().push(`re:${code}`, record) > 3e3) return {
				error: "Слишком много событий",
				status: 429
			};
			let lessonDone = false;
			if (await store().setNx(rx(code, `seen:${b.exercise_id}`), 1)) {
				if (await store().incr(rx(code, `cnt:${lesson}`)) === MODULE_BY_LESSON[lesson].exercises.length && await store().setNx(rx(code, `done:${lesson}`), d)) {
					lessonDone = true;
					const total = Math.min(7200, await store().get(rx(code, `sec:${lesson}`)) || 0);
					await store().push(`re:${code}`, {
						participant_code: code,
						study_day: d,
						event_type: "lesson_done",
						lesson_id: lesson,
						active_seconds: total
					});
				}
			}
			const fresh = await store().get(`rp:${code}`) || got.p;
			if (fresh.stage === "pretest") await store().set(`rp:${code}`, advance(fresh, "material"));
			return {
				correct,
				attempt_no: attempt,
				lesson_done: lessonDone
			};
		},
		progress: async (b) => {
			const got = await loadParticipant(b.code);
			if (got.error) return got;
			const tests = {};
			for (const kind of Object.keys(TEST_WINDOWS)) tests[kind] = !!await store().get(`rt:${got.code}:${kind}`);
			return {
				arm: got.p.arm || null,
				day: studyDay(got.p, now()),
				lessons_done: await lessonsDone(got.code),
				tests,
				forms: {
					pre: formFor(got.p, "pre"),
					post: formFor(got.p, "post"),
					delayed: "C"
				}
			};
		},
		test: async (b) => {
			const got = await loadParticipant(b.code);
			if (got.error) return got;
			if (!["post", "delayed"].includes(b.kind)) return {
				error: "Тест не распознан",
				status: 400
			};
			if (!got.p.arm) return {
				error: "Сначала входной тест",
				status: 409
			};
			if (await store().get(`rt:${got.code}:${b.kind}`)) return {
				error: "Этот тест уже пройден",
				status: 409
			};
			const checked = await checkTest(got.p, got.code, b.kind, b.form, b.items);
			if (checked.error) return checked;
			if (!await store().setNx(`rt:${got.code}:${b.kind}`, checked.rows)) return {
				error: "Этот тест уже пройден",
				status: 409
			};
			await store().del(rx(got.code, `issue:${b.kind}`));
			const used = b.kind === "post" && [
				"no",
				"yes",
				"unsure"
			].includes(b.used_regular_app) ? { used_regular_app: b.used_regular_app } : {};
			const fresh = await store().get(`rp:${got.code}`) || got.p;
			await store().set(`rp:${got.code}`, advance({
				...fresh,
				...used
			}, b.kind === "post" ? "posttest" : "delayed"));
			return { ok: true };
		},
		withdraw: async (b) => {
			const got = await loadParticipant(b.code);
			if (got.error) return got;
			const progress = await store().keys(`rx:${got.code}:`);
			await store().del(`rp:${got.code}`, `re:${got.code}`, `rt:${got.code}:pre`, `rt:${got.code}:post`, `rt:${got.code}:delayed`, `rslot:${got.code}`, `rlock:${got.code}`, ...progress);
			await store().incr("rwithdrawn");
			return { ok: true };
		}
	};
	return async function handler(req, res) {
		try {
			const b = req.body && typeof req.body === "object" ? req.body : {};
			const action = req.method === "GET" ? req.query && req.query.action || "status" : b.action;
			if (action === "export") {
				if (!exportToken || !sameToken(req.headers && req.headers["x-research-token"], exportToken)) return res.status(403).json({ error: "Нет доступа" });
				const keys = await store().keys("rp:");
				const participants = [];
				const events = [];
				const tests = [];
				for (const k of keys) {
					const p = await store().get(k);
					participants.push(exportRecord("participants", p));
					events.push(...await store().list(`re:${p.participant_code}`));
					for (const kind of Object.keys(TEST_WINDOWS)) tests.push(...await store().get(`rt:${p.participant_code}:${kind}`) || []);
				}
				return res.status(200).json({
					protocol: "0.3",
					participants,
					events,
					tests,
					withdrawn: await store().get("rwithdrawn") || 0
				});
			}
			if (action === "purge") {
				if (!exportToken || !sameToken(req.headers && req.headers["x-research-token"], exportToken)) return res.status(403).json({ error: "Нет доступа" });
				if (b.confirm !== "УДАЛИТЬ НАБОР") return res.status(400).json({ error: `Нужна фраза подтверждения: ${PURGE_PHRASE}` });
				const withdrawn = await store().get("rwithdrawn") || 0;
				const keys = [];
				for (const prefix of PURGE_PREFIXES) keys.push(...await store().keys(prefix));
				if (keys.length) await store().del(...keys);
				return res.status(200).json({
					ok: true,
					deleted: keys.length,
					withdrawn
				});
			}
			if (!actions[action]) return res.status(400).json({ error: "Неизвестное действие" });
			if (action !== "status" && !open()) return res.status(403).json({ error: "Исследование сейчас не проводится" });
			const out = await actions[action](b);
			if (out && out.error) return res.status(out.status || 400).json({ error: out.error });
			return res.status(200).json(out);
		} catch (err) {
			console.error("research handler error:", err && err.message);
			return res.status(500).json({ error: "Ошибка сервера" });
		}
	};
}
var research_default = makeHandler({
	status: "closed",
	store: researchStore,
	seed: process.env.RESEARCH_ALLOC_SEED || null,
	exportToken: process.env.RESEARCH_EXPORT_TOKEN || ""
});
const ruNum = (v, digits = 1) => Number.isFinite(v) ? v.toFixed(digits).replace(".", ",") : "—";
const ruSigned = (v, digits = 1) => Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${ruNum(v, digits)}` : "—";
const withUnit = (text, unit) => unit ? `${text} ${unit}` : String(text);
const ruUnit = (v, digits, unit) => withUnit(ruNum(v, digits), unit);
// src/lib/model/distribution.js
const QUINTILES = [
	{
		id: "q1",
		name: "Беднейшие 20%",
		short: "1-й",
		share0: .062,
		src: {
			wage: .36,
			transfer: .54,
			capital: 0,
			informal: .1
		},
		cons: 1,
		food: .52,
		taxable: .55
	},
	{
		id: "q2",
		name: "Ниже среднего",
		short: "2-й",
		share0: .108,
		src: {
			wage: .6,
			transfer: .33,
			capital: .02,
			informal: .05
		},
		cons: .92,
		food: .42,
		taxable: .85
	},
	{
		id: "q3",
		name: "Средние 20%",
		short: "3-й",
		share0: .158,
		src: {
			wage: .75,
			transfer: .18,
			capital: .04,
			informal: .03
		},
		cons: .84,
		food: .34,
		taxable: 1
	},
	{
		id: "q4",
		name: "Выше среднего",
		short: "4-й",
		share0: .228,
		src: {
			wage: .8,
			transfer: .1,
			capital: .08,
			informal: .02
		},
		cons: .74,
		food: .27,
		taxable: 1
	},
	{
		id: "q5",
		name: "Богатейшие 20%",
		short: "5-й",
		share0: .444,
		src: {
			wage: .62,
			transfer: .04,
			capital: .34,
			informal: 0
		},
		cons: .52,
		food: .18,
		taxable: 1
	}
];
const AVG_FOOD = QUINTILES.reduce((a, q) => a + q.food, 0) / QUINTILES.length;
const JOB_LOSS = [
	1.8,
	1.3,
	1,
	.7,
	.4
];
function giniOf(shares) {
	const total = shares.reduce((a, v) => a + v, 0) || 1;
	let cum = 0;
	let area = 0;
	shares.forEach((v) => {
		const prev = cum;
		cum += v / total;
		area += .2 * (prev + cum);
	});
	return clamp(1 - area, 0, 1);
}
function quantileCurve(incomes) {
	const m = incomes.map((v) => Math.max(1e-6, v));
	return [
		[0, m[0] * .35],
		[.2, Math.sqrt(m[0] * m[1])],
		[.4, Math.sqrt(m[1] * m[2])],
		[.6, Math.sqrt(m[2] * m[3])],
		[.8, Math.sqrt(m[3] * m[4])],
		[1, m[4] * 2]
	];
}
function medianOf(incomes) {
	const pts = quantileCurve(incomes);
	return (pts[2][1] + pts[3][1]) / 2;
}
function povertyBelow(incomes, line) {
	const pts = quantileCurve(incomes);
	if (line <= pts[0][1]) return 0;
	for (let i = 1; i < pts.length; i++) {
		const [p0, v0] = pts[i - 1];
		const [p1, v1] = pts[i];
		if (line <= v1) return clamp((p0 + (p1 - p0) * (line - v0) / Math.max(1e-9, v1 - v0)) * 100, 0, 100);
	}
	return 100;
}
function relativePoverty(incomes) {
	return povertyBelow(incomes, .6 * medianOf(incomes));
}
function absolutePoverty(base, line0, quintiles) {
	return povertyBelow(base.map((b, i) => b * (quintiles[i].real || 100) / 100), line0);
}
function taxBurdenOf(q, x) {
	return x.vatRate / (100 + x.vatRate) * q.cons * 100 + x.incomeTaxRate * q.taxable * q.src.wage + x.capitalTaxRate * q.src.capital;
}
function initialDistribution(taxes) {
	const quintiles = QUINTILES.map((q) => ({
		id: q.id,
		income: q.share0 * 100,
		real: 100,
		realYoY: 0,
		inflation: 0,
		taxBurden: taxes ? taxBurdenOf(q, taxes) : 0
	}));
	const disp = quintiles.map((q) => q.income * (1 - q.taxBurden / 100));
	const povertyRate = relativePoverty(disp);
	return {
		quintiles,
		gini: giniOf(disp),
		povertyRate,
		povertyAbs: povertyRate,
		base: disp,
		line0: .6 * medianOf(disp)
	};
}
function distributionStep(prev, x) {
	const p = prev && Array.isArray(prev.quintiles) && prev.quintiles.length === 5 ? prev : initialDistribution();
	const k = .25;
	const du = x.unemployment - x.prevUnemployment || 0;
	const foodGap = x.inflation - x.coreInflation || 0;
	const quintiles = QUINTILES.map((q, i) => {
		const old = p.quintiles[i];
		const wage = x.wageGrowth - JOB_LOSS[i] * du * 4;
		const transfer = x.transfersRealGrowth + x.inflation;
		const capital = x.stockGrowth * 4 * .5 + x.keyRate * .4 + x.gdpGrowth * .5;
		const informal = x.gdpGrowth + x.inflation;
		const nominal = q.src.wage * wage + q.src.transfer * transfer + q.src.capital * capital + q.src.informal * informal;
		const personal = x.coreInflation + foodGap * (q.food / AVG_FOOD);
		const tax = taxBurdenOf(q, x);
		const taxChange = old.taxBurden ? tax - old.taxBurden : 0;
		const income = old.income * (1 + (nominal * k - taxChange) / 100);
		const real = old.real * (1 + ((nominal - personal) * k - taxChange) / 100);
		const hist = [...old.hist || [], real].slice(-5);
		const realYoY = hist.length >= 5 ? (real / hist[0] - 1) * 100 : hist.length >= 2 ? (Math.pow(real / hist[0], 4 / (hist.length - 1)) - 1) * 100 : 0;
		return {
			id: q.id,
			income,
			real,
			hist,
			realYoY,
			inflation: personal,
			taxBurden: tax
		};
	});
	const disp = quintiles.map((q) => q.income * (1 - q.taxBurden / 100));
	const gini = giniOf(disp);
	const povertyRate = relativePoverty(disp);
	const start = Array.isArray(p.base) && p.base.length === 5 ? p : initialDistribution(x);
	return {
		quintiles,
		gini,
		povertyRate,
		povertyAbs: absolutePoverty(start.base, start.line0, quintiles),
		base: start.base,
		line0: start.line0
	};
}
const GROUP_QUINTILE = {
	pensioners: [0, 1],
	workers: [1, 2],
	public: [2],
	business: [4],
	youth: [1, 2],
	regions: [
		0,
		1,
		2
	]
};
function groupRealIncome(dist, groupId) {
	const idx = GROUP_QUINTILE[groupId];
	if (!dist || !dist.quintiles || !idx) return null;
	return idx.reduce((a, i) => a + (dist.quintiles[i].realYoY || 0), 0) / idx.length;
}
// src/lib/world/war.js
const WAR_OBJECTIVES = [
	{
		id: "pass",
		name: "Ледяной перевал",
		headline: "ВЗЯТ ЛЕДЯНОЙ ПЕРЕВАЛ",
		desc: "Горный проход: без него к Нордхольму не подойти. Взятый — облегчает все следующие штурмы и гасит контратаки."
	},
	{
		id: "mines",
		name: "Копи Хальвика",
		headline: "ВЗЯТЫ КОПИ ХАЛЬВИКА",
		desc: "Рудники у самой границы. Взятые — дают стране экспорт руды и удешевляют сырьё."
	},
	{
		id: "city",
		name: "Нордхольм",
		headline: "ВЗЯТ НОРДХОЛЬМ",
		desc: "Столица Норланда. Подойти можно через перевал или со стороны копей Хальвика; её падение при уже взятых целях — капитуляция противника.",
		requiresAny: ["pass", "mines"]
	}
];
const WAR_OBJECTIVES_SW = [
	{
		id: "steppe",
		target: "southwest",
		name: "Приграничные степи",
		headline: "ВЗЯТЫ ПРИГРАНИЧНЫЕ СТЕПИ",
		desc: "Равнина за Приреченской областью: без неё к нефтепромыслам не подойти."
	},
	{
		id: "oil",
		target: "southwest",
		name: "Кумсайские нефтепромыслы",
		headline: "ВЗЯТЫ КУМСАЙСКИЕ НЕФТЕПРОМЫСЛЫ",
		desc: "Нефть Дешта. Взятые — дешевле топливо и дороже экспорт, пока идёт война.",
		requiresAny: ["steppe"]
	},
	{
		id: "ashkala",
		target: "southwest",
		name: "Ашкала",
		headline: "ВЗЯТА АШКАЛА",
		desc: "Столица Дешта: её падение — капитуляция и репарации.",
		requiresAny: ["oil"]
	}
];
const WAR_OBJECTIVES_W = [
	{
		id: "fort",
		target: "west",
		name: "Пограничные укрепления",
		headline: "ПРОРВАНА ПОГРАНИЧНАЯ ЛИНИЯ ВЕСТРАВИИ",
		desc: "Долговременная оборона вдоль границы — первое, что нужно прорвать."
	},
	{
		id: "limmern",
		target: "west",
		name: "Лиммерн",
		headline: "ВЗЯТ ЛИММЕРН",
		desc: "Промышленный город на пути к столице.",
		requiresAny: ["fort"]
	},
	{
		id: "westgrad",
		target: "west",
		name: "Вестград",
		headline: "ВЗЯТ ВЕСТГРАД",
		desc: "Столица Вестравии: её падение — капитуляция и репарации.",
		requiresAny: ["limmern"]
	}
];
const WAR_OBJECTIVE_BY_ID = Object.fromEntries([
	...WAR_OBJECTIVES,
	...WAR_OBJECTIVES_SW,
	...WAR_OBJECTIVES_W
].map((o) => [o.id, o]));
const WAR_TARGETS = {
	north: {
		name: "Норланд",
		gen: "Норланда",
		ins: "с Норландом",
		up: "НОРЛАНД",
		objectives: WAR_OBJECTIVES,
		enemyK: 1,
		front: "mining"
	},
	southwest: {
		name: "Дешт",
		gen: "Дешта",
		ins: "с Дештом",
		up: "ДЕШТ",
		objectives: WAR_OBJECTIVES_SW,
		enemyK: .8,
		front: "agri"
	},
	west: {
		name: "Вестравия",
		gen: "Вестравии",
		ins: "с Вестравией",
		up: "ВЕСТРАВИЯ",
		objectives: WAR_OBJECTIVES_W,
		enemyK: .5,
		front: "periphery",
		partner: true
	}
};
const warTargetOf = (s) => WAR_TARGETS[s && s.warTarget] ? s.warTarget : "north";
const warObjectivesFor = (target) => (WAR_TARGETS[target] || WAR_TARGETS.north).objectives;
function warTargetAvailable(s, target) {
	if (s.economyOnly || !WAR_TARGETS[target] || (s.warQuartersLeft || 0) > 0) return false;
	if (target === "north") return (s.annexed || []).length < 3;
	return true;
}
function defaultWarTarget(s) {
	const rel = relationsOf(s);
	return Object.keys(WAR_TARGETS).filter((t) => warTargetAvailable(s, t)).sort((a, b) => rel[a] - rel[b])[0] || "north";
}
const sanitizeWarTarget = (t, s) => warTargetAvailable(s, t) ? t : !t && warTargetAvailable(s, "north") ? "north" : defaultWarTarget(s);
const WAR_STANCES = [
	{
		id: "assault",
		label: "Штурм",
		spend: .35,
		desc: "Быстрое продвижение, но большие потери и расходы."
	},
	{
		id: "siege",
		label: "Осада и обстрел",
		spend: .2,
		desc: "Медленнее, дешевле, потерь меньше."
	},
	{
		id: "hold",
		label: "Держать позиции",
		spend: .1,
		desc: "Фронт почти не движется, контратаки противника слабее."
	},
	{
		id: "ceasefire",
		label: "Предложить перемирие",
		spend: 0,
		desc: "Закончить войну по нынешней линии фронта; взятые цели остаются за страной."
	}
];
const newWarCampaign = (annexed, target = "north") => {
	const own = target === "north" ? annexed || [] : [];
	return {
		progress: Object.fromEntries(warObjectivesFor(target).map((o) => [o.id, own.includes(o.id) ? 100 : 0])),
		captured: [...own],
		last: null
	};
};
const ANNEX_EFFECT = {
	pass: {
		name: "Перевальский район",
		impulses: (d) => [makeImpulse("laborForce", .2, "Присоединён Перевальский район", "slow", d, "other")]
	},
	mines: {
		name: "Хальвикский край",
		impulses: (d) => [
			makeImpulse("laborForce", .3, "Присоединён Хальвикский край", "slow", d, "other"),
			sustainedImpulse("exportsGrowth", .8, 16, "Руда Хальвикского края"),
			makeImpulse("inflationSupply", -.2, "Своя руда Хальвика", "slow", d, "other")
		]
	},
	city: {
		name: "Нордхольмская область",
		impulses: (d) => [makeImpulse("laborForce", .8, "Присоединена Нордхольмская область", "slow", d, "other"), makeImpulse("approvalPush", 3, "Присоединена Нордхольмская область", "fast", d, "other")]
	}
};
const warObjectiveOpen = (id, camp) => {
	const o = WAR_OBJECTIVE_BY_ID[id];
	const cap = camp.captured || [];
	return !!o && !cap.includes(id) && (!o.requires || cap.includes(o.requires)) && (!o.requiresAny || o.requiresAny.some((x) => cap.includes(x)));
};
function warStrength(s) {
	const defense = s.budgetShares && s.budgetShares.defense || 15;
	return clamp(.55 + (defense - 10) / 20 + ((s.approval || 50) - 50) / 200, .45, 1.5);
}
function defaultWarOrder(camp, enemy = "north") {
	const last = camp.last && camp.last.stance !== "ceasefire" ? camp.last : null;
	const first = warObjectivesFor(enemy).find((o) => warObjectiveOpen(o.id, camp));
	return {
		target: last && warObjectiveOpen(last.target, camp) ? last.target : first ? first.id : null,
		stance: last ? last.stance : "siege"
	};
}
function botWarOrder(s, personaId) {
	const target = warTargetOf(s);
	const camp = s.warCampaign || newWarCampaign(s.annexed, target);
	const order = defaultWarOrder(camp, target);
	if (!order.target) return {
		target: null,
		stance: "ceasefire"
	};
	const approval = s.approval || 50;
	if (personaId === "strongman") order.stance = approval > 20 ? "assault" : "ceasefire";
	else if (personaId === "populist") order.stance = approval > 45 ? "assault" : approval > 30 ? "hold" : "ceasefire";
	else {
		order.stance = "siege";
		if (camp.captured.length >= 1 && approval < 45 || approval < 30) order.stance = "ceasefire";
	}
	const best = warObjectivesFor(target).filter((o) => warObjectiveOpen(o.id, camp)).sort((a, b) => camp.progress[b.id] - camp.progress[a.id])[0];
	if (best) order.target = best.id;
	return order;
}
function warCampaignStep(s, decisions, difficulty) {
	const out = {
		impulses: [],
		news: [],
		spendPct: 0,
		endWar: false,
		victory: false
	};
	if (!((s.warQuartersLeft || 0) > 0 && s.warType === "offensive")) return {
		...out,
		campaign: null
	};
	const tgt = warTargetOf(s);
	const T = WAR_TARGETS[tgt];
	const OBJ = T.objectives;
	const camp = s.warCampaign ? {
		progress: { ...s.warCampaign.progress },
		captured: [...s.warCampaign.captured || []],
		last: s.warCampaign.last
	} : newWarCampaign(s.annexed, tgt);
	const def = defaultWarOrder(camp, tgt);
	const raw = decisions.warOrder || {};
	const stance = WAR_STANCES.find((x) => x.id === raw.stance) || WAR_STANCES.find((x) => x.id === def.stance) || WAR_STANCES[1];
	const target = warObjectiveOpen(raw.target, camp) ? raw.target : def.target;
	out.spendPct = stance.spend;
	const pressFree = s.politicalRegime !== "authoritarian" && s.politicalRegime !== "totalitarian";
	if (stance.id === "ceasefire" || !target) {
		out.endWar = true;
		const n = camp.captured.length;
		out.impulses.push(makeImpulse("approvalPush", n ? 2 * n : -3, `Перемирие ${T.ins}`, "fast", difficulty, "other"), makeImpulse("businessConfidence", 4, "Боевые действия прекращены", "default", difficulty, "other"), makeImpulse("tensionPush", n ? -2 : 3, `Перемирие ${T.ins}`, "fast", difficulty, "other"));
		if (tgt !== "north" && n) out.impulses.push(sustainedImpulse("revenue", (s.nominalGdp || 0) * .25 * n / 100, 6, `Выплаты ${T.gen} по перемирию`));
		out.news.push([
			"gov",
			`ПЕРЕМИРИЕ ${T.ins.toUpperCase()}`,
			n ? tgt === "north" ? `Боевые действия остановлены по линии фронта. За страной остаётся: ${camp.captured.map((id) => WAR_OBJECTIVE_BY_ID[id].name).join(", ")}.` : `Боевые действия остановлены. Взятое (${camp.captured.map((id) => WAR_OBJECTIVE_BY_ID[id].name).join(", ")}) возвращается ${T.gen === "Вестравии" ? "Вестравии" : "Дешту"} — в обмен на выплаты полтора года.` : `Боевые действия остановлены там же, где начались.${pressFree ? " Цели операции не достигнуты — и это понятно всем." : " Официально — ради сохранения жизней."}`,
			10
		]);
		camp.last = {
			target: null,
			stance: "ceasefire",
			gained: 0,
			counter: null
		};
		return {
			...out,
			campaign: camp
		};
	}
	if ((s.warElapsed || 0) >= 10) out.impulses.push(makeImpulse("exportsGrowth", -.6, "Санкции за затяжную войну", "fast", difficulty, "other"), makeImpulse("approvalPush", -.6, "Усталость от затяжной войны", "fast", difficulty, "other"), makeImpulse("riskPremium", .04, "Затяжная война", "fast", difficulty));
	if (T.partner) out.impulses.push(makeImpulse("exportsGrowth", -1.5, "Торговля с Вестравией закрыта", "fast", difficulty, "other"), makeImpulse("capitalFlow", -5, "Вестравские банки отзывают кредиты", "fast", difficulty));
	const strength = warStrength(s) * T.enemyK;
	const passBonus = camp.captured.includes("pass") || camp.captured.includes("steppe") || camp.captured.includes("fort") ? 1.25 : 1;
	const gain = stance.id === "assault" ? strength * (16 + 18 * rng()) * passBonus : stance.id === "siege" ? strength * (6 + 8 * rng()) * passBonus : strength * 2 * rng();
	camp.progress[target] = clamp(camp.progress[target] + gain, 0, 100);
	if (stance.id === "assault") out.impulses.push(makeImpulse("approvalPush", -1.5, "Потери при штурме", "fast", difficulty, "other"), makeImpulse("tensionPush", 1.5, "Потери при штурме", "fast", difficulty, "other"));
	else if (stance.id === "siege") out.impulses.push(makeImpulse("approvalPush", -.5, "Затяжная осада", "fast", difficulty, "other"));
	let counter = null;
	const counterChance = (stance.id === "hold" ? .1 : .25) * (camp.captured.includes("pass") ? .5 : 1) / Math.sqrt(T.enemyK);
	if (rng() < counterChance) {
		const cands = OBJ.filter((o) => !camp.captured.includes(o.id) && camp.progress[o.id] > 0);
		if (cands.length) {
			const o = cands[Math.floor(rng() * cands.length)];
			const lost = 8 + 8 * rng();
			camp.progress[o.id] = clamp(camp.progress[o.id] - lost, 0, 100);
			counter = {
				target: o.id,
				lost: Math.round(lost)
			};
			out.news.push([
				"crisis",
				`КОНТРАТАКА У ЦЕЛИ «${o.name.toUpperCase()}»`,
				`Противник отбил часть позиций: продвижение откатилось на ${Math.round(lost)} п.`,
				7
			]);
		}
	}
	if (camp.progress[target] >= 100 && !camp.captured.includes(target)) {
		camp.captured.push(target);
		const o = WAR_OBJECTIVE_BY_ID[target];
		if (target === "mines") out.impulses.push(sustainedImpulse("exportsGrowth", 1.2, 8, "Руда Хальвика идёт на экспорт"), makeImpulse("inflationSupply", -.2, "Сырьё Хальвика дешевле", "slow", difficulty, "other"));
		if (target === "oil") out.impulses.push(sustainedImpulse("exportsGrowth", .8, 6, "Нефть Кумсая"), makeImpulse("inflationSupply", -.3, "Топливо дешевле: нефть Кумсая", "slow", difficulty, "other"));
		out.impulses.push(makeImpulse("approvalPush", target === "city" ? 4 : 2, `Взята цель: ${o.name}`, "fast", difficulty, "other"));
		out.news.push([
			"gov",
			o.headline,
			o.desc,
			9
		]);
	}
	if (OBJ.every((o) => camp.captured.includes(o.id))) {
		out.endWar = true;
		out.victory = true;
		out.impulses.push(makeImpulse("approvalPush", 6, `Победа над ${T.gen === "Вестравии" ? "Вестравией" : T.gen === "Дешта" ? "Дештом" : "Норландом"}`, "fast", difficulty, "other"), makeImpulse("tensionPush", -4, "Победа в войне", "fast", difficulty, "other"), makeImpulse("businessConfidence", 3, "Война окончена", "default", difficulty, "other"));
		if (tgt !== "north") out.impulses.push(sustainedImpulse("revenue", (s.nominalGdp || 0) * .9 / 100, 8, `Репарации ${T.gen}`));
		out.news.push([
			"gov",
			`${T.up} ПОДПИСЫВАЕТ КАПИТУЛЯЦИЮ`,
			tgt === "north" ? "Все цели операции взяты, противник принимает условия. Санкции за войну никуда не деваются — они снимаются дольше, чем вводились." : `Все цели операции взяты. Войска уходят домой, а ${T.gen === "Дешта" ? "Дешт" : "Вестравия"} два года платит репарации — около 0,9% ВВП в год. Соседи этого не забудут.`,
			10
		]);
	}
	camp.last = {
		target,
		stance: stance.id,
		gained: Math.round(gain),
		counter
	};
	return {
		...out,
		campaign: camp
	};
}
const PARTISAN_INCIDENTS = {
	pereval: {
		headline: "ПОДРЫВ НА ПЕРЕВАЛЬСКОЙ ДОРОГЕ",
		text: (l) => `Ночью подорвали мост на серпантине, колонны с грузом стоят. Лояльность района ${Math.round(l)} из 100 — новой власти здесь пока не рады.`,
		impulses: (d) => [
			makeImpulse("exportsGrowth", -.8, "Подрыв на перевальской дороге", "fast", d, "other"),
			makeImpulse("riskPremium", .03, "Диверсии на новых землях", "fast", d),
			makeImpulse("tensionPush", 1, "Диверсия на перевале", "fast", d, "other")
		]
	},
	halvik: {
		headline: "САБОТАЖ НА ХАЛЬВИКСКИХ КОПЯХ",
		text: (l) => `На копях Хальвика залиты две шахты и сожжён склад взрывчатки. Лояльность края ${Math.round(l)} из 100.`,
		impulses: (d) => [makeImpulse("exportsGrowth", -1.2, "Саботаж на копях Хальвика", "fast", d, "other"), makeImpulse("inflationSupply", .1, "Руда Хальвика встала", "fast", d, "other")]
	},
	nordholm: {
		headline: "ПОДПОЛЬЕ В НОРДХОЛЬМЕ: НАПАДЕНИЕ НА КОМЕНДАТУРУ",
		text: (l) => `В Нордхольме обстреляна комендатура, в городе комендантский час. Лояльность области ${Math.round(l)} из 100 — город ждёт возвращения Норланда.`,
		impulses: (d) => [
			makeImpulse("tensionPush", 2, "Нападение на комендатуру в Нордхольме", "fast", d, "other"),
			makeImpulse("approvalPush", -1, "Новые земли неспокойны", "fast", d, "other"),
			makeImpulse("govTrust", -1, "Подполье в Нордхольме", "default", d, "other")
		]
	}
};
function sanitizeIntegration(list, s) {
	const own = activeRegions(s).filter((r) => r.annex && annexLoyalty(s, r.id) < 100).map((r) => r.id);
	return Array.isArray(list) ? [...new Set(list.filter((id) => own.includes(id)))] : [];
}
function annexStep(s, decisions, difficulty, loyaltyDelta) {
	const out = {
		impulses: [],
		news: [],
		spendPct: 0,
		loyalty: {},
		integrated: [...s.annexIntegrated || []],
		shock: {},
		funded: []
	};
	const regions = activeRegions(s).filter((r) => r.annex);
	if (!regions.length) return out;
	const plan = new Set(sanitizeIntegration(decisions.integrate == null ? s.annexFunded : decisions.integrate, s));
	const underAttack = (s.warQuartersLeft || 0) > 0 && s.warType === "revanche";
	regions.forEach((r) => {
		let l = annexLoyalty(s, r.id);
		let d = 1 + ((loyaltyDelta || {})[r.id] || 0);
		const wasFunded = (s.annexFunded || []).includes(r.id);
		if (plan.has(r.id)) {
			d += 6;
			out.spendPct += INTEGRATION_COST;
			out.funded.push(r.id);
		}
		if ((s.projects || []).some((x) => x.region === r.id)) d += 2;
		if (underAttack) d -= 3;
		if ((s.politicalTension || 0) > 45) d -= (s.politicalTension - 45) * .06;
		l = clamp(l + d, 0, 100);
		if (l >= 100 && (plan.has(r.id) || wasFunded)) {
			out.funded = out.funded.filter((id) => id !== r.id);
			out.news.push([
				"gov",
				`${r.name.toUpperCase()}: ПРОГРАММА ИНТЕГРАЦИИ ВЫПОЛНЕНА`,
				`Лояльность ${r.gen} достигла 100 из 100 — деньги на интеграцию больше не нужны, программа закрыта.`,
				6
			]);
		}
		if (l < 35 && rng() < .15 + (35 - l) / 35 * .45) {
			const inc = PARTISAN_INCIDENTS[r.id];
			out.impulses.push(...inc.impulses(difficulty));
			out.spendPct += .03;
			out.shock[r.id] = (out.shock[r.id] || 0) + 6;
			out.news.push([
				"crisis",
				inc.headline,
				inc.text(l),
				7
			]);
		}
		if (l >= 50 && !out.integrated.includes(r.id)) {
			out.integrated.push(r.id);
			out.impulses.push(makeImpulse("approvalPush", 1, `${r.name}: интеграция завершена`, "fast", difficulty, "other"));
			out.news.push([
				"gov",
				`${r.name.toUpperCase()} ВПЕРВЫЕ ГОЛОСУЕТ ВМЕСТЕ СО СТРАНОЙ`,
				`Комендатуры сменяются обычной администрацией, партизан больше не слышно. Лояльность ${r.gen} — ${Math.round(l)} из 100: теперь это не только новая земля на карте, но и новые избиратели.`,
				8
			]);
		}
		out.loyalty[r.id] = l;
	});
	return out;
}
const TREATY_LAND_VALUE = {
	pereval: 18,
	halvik: 22,
	nordholm: 35
};
const OBJECTIVE_VALUE = {
	pass: 18,
	mines: 22,
	city: 35
};
const heldAnnex = (s) => activeRegions(s).filter((r) => r.annex).map((r) => r.id);
function sanitizeTreaty(t, s) {
	if (!t || typeof t !== "object") return null;
	const held = heldAnnex(s);
	return {
		recognition: !!t.recognition,
		sanctions: !!t.sanctions,
		reparations: t.reparations === "receive" || t.reparations === "pay" ? t.reparations : null,
		returned: Array.isArray(t.returned) ? [...new Set(t.returned.filter((id) => held.includes(id)))] : [],
		propose: !!t.propose,
		walkAway: !!t.walkAway
	};
}
function treatyCost(terms, s) {
	if (!terms) return 0;
	const kept = heldAnnex(s).filter((id) => !terms.returned.includes(id));
	let c = 0;
	if (terms.recognition) c += 10 + 12 * kept.length + (kept.includes("nordholm") ? 15 : 0);
	if (terms.sanctions) c += 15;
	if (terms.reparations === "receive") c += 25;
	if (terms.reparations === "pay") c -= 25;
	terms.returned.forEach((id) => {
		c -= TREATY_LAND_VALUE[id] || 0;
	});
	return c;
}
function botTreaty(s, personaId) {
	const talks = s.peaceTalks;
	if (!talks) return null;
	const order = personaId === "strongman" ? [
		"reparations",
		"recognition",
		"sanctions"
	] : personaId === "populist" ? [
		"recognition",
		"reparations",
		"sanctions"
	] : [
		"recognition",
		"sanctions",
		"reparations"
	];
	const terms = {
		recognition: false,
		sanctions: false,
		reparations: null,
		returned: [],
		propose: true,
		walkAway: false
	};
	order.forEach((k) => {
		const next = {
			...terms,
			[k]: k === "reparations" ? "receive" : true
		};
		if (treatyCost(next, s) <= talks.leverage) Object.assign(terms, next);
	});
	return terms;
}
function dropAnnexed(state, regionIds) {
	const objs = regionIds.map((id) => (regionById(id) || {}).objective).filter(Boolean);
	const lostProjects = new Set(REGION_PROJECTS.filter((p) => regionIds.includes(p.region)).map((p) => p.id));
	const loyalty = { ...state.annexLoyalty };
	regionIds.forEach((id) => {
		delete loyalty[id];
	});
	return {
		annexed: (state.annexed || []).filter((o) => !objs.includes(o)),
		annexLoyalty: loyalty,
		annexIntegrated: (state.annexIntegrated || []).filter((id) => !regionIds.includes(id)),
		annexFunded: (state.annexFunded || []).filter((id) => !regionIds.includes(id)),
		projects: (state.projects || []).filter((x) => !lostProjects.has(x.id)),
		projectsBuilt: (state.projectsBuilt || []).filter((id) => !lostProjects.has(id)),
		regionEvent: state.regionEvent && regionIds.includes(state.regionEvent.region) ? null : state.regionEvent
	};
}
const DEFENSE_STANCES = [
	{
		id: "defend",
		label: "Держать оборону",
		spend: .15,
		desc: "Укрепить выбранную область: удар по ней почти не продвинется, но остальные прикрыты слабее."
	},
	{
		id: "counter",
		label: "Контрудар",
		spend: .35,
		desc: "Отбросить противника там, где он уже продвинулся. Дорого и с потерями, зато ломает его боевой дух."
	},
	{
		id: "talks",
		label: "Переговоры о перемирии",
		spend: 0,
		desc: "Остановить войну и сесть за стол. Чем больше потеряно, тем хуже условия."
	}
];
function revancheGrowth(s) {
	const n = heldAnnex(s).length;
	if (!n) return -10;
	const t = s.treaty;
	const mult = (t && t.recognized ? .05 : t ? .6 : 1) * (s.peaceTalks ? .5 : 1);
	const deter = (warStrength(s) - 1) * 6;
	const crisis = (s.activeCrises || []).filter((c) => c !== "war").length * 1.5;
	return Math.max(0, (3 + 3 * n + crisis) * mult - deter);
}
function revancheTarget(s, camp) {
	return heldAnnex(s).filter((id) => !(camp.lost || []).includes(id)).sort((a, b) => (camp.pressure[b] || 0) + (60 - annexLoyalty(s, b)) - ((camp.pressure[a] || 0) + (60 - annexLoyalty(s, a))))[0] || null;
}
function defaultDefenseOrder(camp) {
	const last = camp.last && camp.last.stance !== "talks" ? camp.last : null;
	return {
		target: camp.next,
		stance: last ? last.stance : "defend"
	};
}
function botDefenseOrder(s, personaId) {
	const camp = s.revancheCampaign;
	if (!camp) return null;
	const worst = Object.entries(camp.pressure).filter(([id]) => heldAnnex(s).includes(id)).sort((a, b) => b[1] - a[1])[0];
	const approval = s.approval || 50;
	if (personaId === "strongman") return worst && worst[1] > 40 ? {
		target: worst[0],
		stance: "counter"
	} : {
		target: camp.next,
		stance: "defend"
	};
	if (personaId === "populist") return approval < 30 ? {
		target: camp.next,
		stance: "talks"
	} : {
		target: camp.next,
		stance: "defend"
	};
	if ((camp.lost || []).length || approval < 35) return {
		target: camp.next,
		stance: "talks"
	};
	return {
		target: camp.next,
		stance: "defend"
	};
}
function revancheStep(s, decisions, difficulty, q, blockStart) {
	const out = {
		impulses: [],
		news: [],
		spendPct: 0,
		start: false,
		endWar: false,
		lost: [],
		campaign: null,
		revanche: s.norlandRevanche || 0,
		talks: null,
		warned: !!s.revancheWarned
	};
	if (!((s.warQuartersLeft || 0) > 0)) {
		out.revanche = clamp(out.revanche + revancheGrowth(s), -50, 100);
		if (out.revanche >= 70 && !out.warned && heldAnnex(s).length) {
			out.warned = true;
			out.news.push([
				"crisis",
				"НОРЛАНД СТЯГИВАЕТ ВОЙСКА К НОВОЙ ГРАНИЦЕ",
				`Разведка докладывает: реваншизм в Норланде ${Math.round(out.revanche)} из 100. Сильная армия и признанная граница остужают его, кризисы в стране — подогревают.`,
				8
			]);
		}
		if (out.revanche < 50) out.warned = false;
		if (out.revanche >= 100 && heldAnnex(s).length && !blockStart) {
			out.start = true;
			const camp = {
				pressure: Object.fromEntries(heldAnnex(s).map((id) => [id, 0])),
				morale: 100,
				lost: [],
				last: null,
				next: null
			};
			camp.next = revancheTarget(s, camp);
			out.campaign = camp;
			out.impulses.push(taperedImpulse("approvalPush", [
				4,
				2,
				1
			], "Страну атаковали: сплочение", "other"), makeImpulse("tensionPush", 8, "Норланд напал", "fast", difficulty, "other"), makeImpulse("riskPremium", .5, "Война на новой границе", "default", difficulty), makeImpulse("capitalFlow", -12, "Война на новой границе", "default", difficulty), makeImpulse("businessConfidence", -8, "Война на новой границе", "default", difficulty, "other"), makeImpulse("inflationSupply", .5, "Война на новой границе", "default", difficulty), makeImpulse("exportsGrowth", -2, "Война на новой границе", "default", difficulty, "other"), makeImpulse("stockShock", -8, "Война на новой границе", "fast", difficulty));
			out.news.push([
				"crisis",
				"НОРЛАНД НАЧАЛ ВОЙНУ ЗА ПОТЕРЯННЫЕ ЗЕМЛИ",
				`Норландские войска перешли новую границу. Первые бои идут в ${regionById(camp.next).loc}.${s.treaty && s.treaty.recognized ? " Норланд нарушил договор, в котором сам признал границу." : ""}`,
				10
			]);
			out.revanche = 0;
		}
		return out;
	}
	if (s.warType !== "revanche" || !s.revancheCampaign) return out;
	const camp = {
		...s.revancheCampaign,
		pressure: { ...s.revancheCampaign.pressure },
		lost: [...s.revancheCampaign.lost || []]
	};
	const held = heldAnnex(s).filter((id) => !camp.lost.includes(id));
	const def = defaultDefenseOrder(camp);
	const raw = decisions.warOrder || {};
	const stance = DEFENSE_STANCES.find((x) => x.id === raw.stance) || DEFENSE_STANCES.find((x) => x.id === def.stance) || DEFENSE_STANCES[0];
	const target = held.includes(raw.target) ? raw.target : held.includes(def.target) ? def.target : held[0];
	out.spendPct = stance.spend;
	if (stance.id === "talks" || !held.length) {
		out.endWar = true;
		out.talks = held.length ? {
			since: q,
			leverage: Math.max(0, 5 + 6 * held.length - 10 * camp.lost.length + (100 - camp.morale) * .3),
			attempts: 0,
			origin: "revanche"
		} : null;
		out.impulses.push(makeImpulse("approvalPush", -2, "Перемирие на условиях войны", "fast", difficulty, "other"), makeImpulse("businessConfidence", 3, "Бои на границе прекращены", "default", difficulty, "other"));
		out.revanche = -10 - (100 - camp.morale) * .3;
		out.news.push([
			"gov",
			"ПЕРЕМИРИЕ С НОРЛАНДОМ НА НОВОЙ ГРАНИЦЕ",
			"Стрельба прекращена, стороны садятся за стол. Условия будут зависеть от того, что удалось удержать.",
			9
		]);
		camp.last = {
			target,
			stance: "talks",
			hit: null,
			gain: 0,
			pushed: 0
		};
		out.campaign = camp;
		return out;
	}
	const planned = held.includes(camp.next) ? camp.next : revancheTarget(s, camp);
	const others = held.filter((id) => id !== planned);
	const feint = others.length > 0 && rng() < .3;
	const hit = feint ? others[Math.floor(rng() * others.length)] : planned;
	const nStr = .5 + camp.morale / 200;
	const loyal = 1 + Math.max(0, 50 - annexLoyalty(s, hit)) / 100;
	let gain = (12 + 10 * rng()) * nStr * loyal / warStrength(s);
	if (target === hit) gain *= stance.id === "defend" ? .3 : .6;
	camp.pressure[hit] = clamp((camp.pressure[hit] || 0) + gain, 0, 100);
	let pushed = 0;
	if (stance.id === "counter") {
		pushed = warStrength(s) * (10 + 12 * rng());
		camp.pressure[target] = clamp((camp.pressure[target] || 0) - pushed, 0, 100);
		camp.morale -= 6 + 6 * rng();
		out.impulses.push(makeImpulse("approvalPush", -1.5, "Потери при контрударе", "fast", difficulty, "other"), makeImpulse("tensionPush", 1, "Потери при контрударе", "fast", difficulty, "other"));
	}
	if (target === hit && stance.id === "defend") camp.morale -= 5;
	camp.morale = Math.max(0, camp.morale - 3);
	if (feint) out.news.push([
		"crisis",
		"РАЗВЕДКА ОШИБЛАСЬ",
		`Норланд ударил не туда, где его ждали: бои идут в ${regionById(hit).loc}.`,
		7
	]);
	if (camp.pressure[hit] >= 100) {
		camp.lost.push(hit);
		out.lost.push(hit);
		const r = regionById(hit);
		out.impulses.push(makeImpulse("approvalPush", -4, `Потерян ${r.name}`, "fast", difficulty, "other"), makeImpulse("tensionPush", 4, `Потерян ${r.name}`, "fast", difficulty, "other"));
		out.news.push([
			"crisis",
			`НОРЛАНД ВЕРНУЛ СЕБЕ: ${r.name.toUpperCase()}`,
			`Оборона ${r.gen} прорвана. Земля, за которую воевали, снова норландская.`,
			10
		]);
	}
	const stillHeld = held.filter((id) => !camp.lost.includes(id));
	if (!stillHeld.length) {
		out.endWar = true;
		out.news.push([
			"crisis",
			"НОРЛАНД ВЕРНУЛ ВСЕ ПОТЕРЯННЫЕ ЗЕМЛИ",
			"Война за новые земли проиграна: граница там же, где была до первой войны.",
			10
		]);
	} else if (camp.morale <= 0) {
		out.endWar = true;
		out.talks = {
			since: q,
			leverage: 35 + 10 * stillHeld.length,
			attempts: 0,
			origin: "revanche"
		};
		out.impulses.push(makeImpulse("approvalPush", 4, "Норланд отступил", "fast", difficulty, "other"));
		out.revanche = -40;
		out.news.push([
			"gov",
			"НОРЛАНД ПРОСИТ МИРА",
			"Атаки захлебнулись, армия Норланда выдохлась и предлагает переговоры. Позиция страны за столом сильная.",
			10
		]);
	}
	camp.last = {
		target,
		stance: stance.id,
		hit,
		gain: Math.round(gain),
		pushed: Math.round(pushed),
		feint
	};
	camp.next = stillHeld.length ? revancheTarget(s, camp) : null;
	out.campaign = camp;
	return out;
}
const DEF_FRONT = ["agri", "periphery"];
const DEF_ENEMY = "Республика Дешт";
const warLasted = (n) => `Война шла ${n} ${n % 10 === 1 && n % 100 !== 11 ? "квартал" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "квартала" : "кварталов"}.`;
function newDefenseCampaign() {
	return {
		pressure: {
			agri: 0,
			periphery: 0
		},
		occupied: [],
		morale: 100,
		last: null,
		next: "agri"
	};
}
function defenseTarget(camp) {
	return DEF_FRONT.filter((id) => !camp.occupied.includes(id)).sort((a, b) => (camp.pressure[b] || 0) - (camp.pressure[a] || 0))[0] || null;
}
function defaultFrontOrder(camp) {
	const last = camp.last && camp.last.stance !== "talks" ? camp.last : null;
	return {
		target: last && last.stance === "counter" && camp.occupied.includes(last.target) ? last.target : camp.next || DEF_FRONT[0],
		stance: last ? last.stance : "defend"
	};
}
function botFrontOrder(s, personaId) {
	const camp = s.defenseCampaign;
	if (!camp) return null;
	const occ = camp.occupied[0];
	if (personaId === "strongman") return occ ? {
		target: occ,
		stance: "counter"
	} : {
		target: camp.next,
		stance: "defend"
	};
	if (occ && warStrength(s) >= .85) return {
		target: occ,
		stance: "counter"
	};
	if (personaId === "populist" && (s.approval || 50) < 30 && (s.warElapsed || 0) >= 2) return {
		target: camp.next,
		stance: "talks"
	};
	if (camp.occupied.length >= 2) return {
		target: camp.next,
		stance: "talks"
	};
	return {
		target: camp.next || DEF_FRONT[0],
		stance: "defend"
	};
}
function defenseStep(s, decisions, difficulty, q, starting) {
	const out = {
		impulses: [],
		news: [],
		spendPct: 0,
		endWar: false,
		campaign: null,
		shock: {}
	};
	if (starting) {
		out.campaign = newDefenseCampaign();
		return out;
	}
	if (!((s.warQuartersLeft || 0) > 0 && s.warType === "defensive")) return out;
	const prev = s.defenseCampaign || newDefenseCampaign();
	const camp = {
		...prev,
		pressure: { ...prev.pressure },
		occupied: [...prev.occupied || []]
	};
	const raw = decisions.warOrder || {};
	const def = defaultFrontOrder(camp);
	const stance = DEFENSE_STANCES.find((x) => x.id === raw.stance) || DEFENSE_STANCES.find((x) => x.id === def.stance) || DEFENSE_STANCES[0];
	const target = DEF_FRONT.includes(raw.target) ? raw.target : def.target;
	const nameOf = (id) => regionById(id);
	out.spendPct = stance.spend;
	if (stance.id === "talks") {
		out.endWar = true;
		const lost = camp.occupied.length;
		out.impulses.push(makeImpulse("approvalPush", -2 - 3 * lost, "Перемирие с Дештом", "fast", difficulty, "other"), makeImpulse("businessConfidence", 4, "Бои прекращены", "default", difficulty, "other"));
		out.news.push([
			"gov",
			`ПЕРЕМИРИЕ: ${DEF_ENEMY.toUpperCase()} ОСТАНАВЛИВАЕТ НАСТУПЛЕНИЕ`,
			lost ? `Стрельба прекращена. Занятые районы ${camp.occupied.map((id) => nameOf(id).gen).join(" и ")} возвращаются по соглашению — ценой уступок, которые оппозиция назовёт капитуляцией. ${warLasted((s.warElapsed || 1) + 1)}` : `Стрельба прекращена, фронт удержан. Мир дороже войны, но его цену ещё будут вспоминать. ${warLasted((s.warElapsed || 1) + 1)}`,
			9
		]);
		camp.last = {
			target,
			stance: "talks",
			hit: null,
			gain: 0,
			pushed: 0
		};
		out.campaign = camp;
		return out;
	}
	const free = DEF_FRONT.filter((id) => !camp.occupied.includes(id));
	const planned = free.includes(camp.next) ? camp.next : defenseTarget(camp);
	const others = free.filter((id) => id !== planned);
	const feint = !!planned && others.length > 0 && rng() < .25;
	const hit = feint ? others[Math.floor(rng() * others.length)] : planned;
	let gain = 0;
	if (hit) {
		const nStr = .5 + camp.morale / 200;
		gain = (11 + 9 * rng()) * nStr / warStrength(s);
		if (target === hit) gain *= stance.id === "defend" ? .3 : .6;
		camp.pressure[hit] = clamp((camp.pressure[hit] || 0) + gain, 0, 100);
		if (camp.pressure[hit] >= 100 && !camp.occupied.includes(hit)) {
			camp.occupied.push(hit);
			out.impulses.push(makeImpulse("approvalPush", -4, `Оккупирована ${nameOf(hit).name}`, "fast", difficulty, "other"), makeImpulse("tensionPush", 4, `Оккупирована ${nameOf(hit).name}`, "fast", difficulty, "other"));
			out.news.push([
				"crisis",
				`ФРОНТ ПРОРВАН: ЗАНЯТА ${nameOf(hit).name.toUpperCase()}`,
				`Войска Дешта вошли в ${nameOf(hit).city}. Пока область под оккупацией, её хозяйство стоит, а люди бегут в тыл. Отбить её можно только контрударом.`,
				10
			]);
		}
	}
	let pushed = 0;
	if (stance.id === "counter") {
		pushed = warStrength(s) * (10 + 12 * rng());
		camp.pressure[target] = clamp((camp.pressure[target] || 0) - pushed, 0, 100);
		camp.morale -= 6 + 6 * rng();
		out.impulses.push(makeImpulse("approvalPush", -1.5, "Потери при контрударе", "fast", difficulty, "other"));
		if (camp.occupied.includes(target) && camp.pressure[target] < 60) {
			camp.occupied = camp.occupied.filter((id) => id !== target);
			out.impulses.push(makeImpulse("approvalPush", 4, `Освобождена ${nameOf(target).name}`, "fast", difficulty, "other"));
			out.news.push([
				"gov",
				`ОСВОБОЖДЕНА ${nameOf(target).name.toUpperCase()}`,
				`Контрудар отбросил противника: ${nameOf(target).city} снова под контролем страны.`,
				10
			]);
		}
	}
	if (hit && target === hit && stance.id === "defend") camp.morale -= 5;
	camp.morale = Math.max(0, camp.morale - 4);
	if (feint) out.news.push([
		"crisis",
		"РАЗВЕДКА ОШИБЛАСЬ",
		`${DEF_ENEMY} ударила не там, где её ждали: бои идут в ${nameOf(hit).loc}.`,
		7
	]);
	camp.occupied.forEach((id) => {
		out.shock[id] = 25;
		out.impulses.push(makeImpulse("potentialShock", -.25, `Оккупация: ${nameOf(id).name}`, "fast", difficulty), makeImpulse("consumption", -.8, `Оккупация: ${nameOf(id).name}`, "fast", difficulty), makeImpulse("approvalPush", -1.2, `Оккупация: ${nameOf(id).name}`, "fast", difficulty, "other"));
	});
	if (camp.morale <= 0) {
		out.endWar = true;
		out.impulses.push(makeImpulse("approvalPush", 5, `${DEF_ENEMY} отступила`, "fast", difficulty, "other"));
		out.news.push([
			"gov",
			`${DEF_ENEMY.toUpperCase()} ОТСТУПАЕТ`,
			"Наступление захлебнулось: армия противника выдохлась и уходит за границу. Занятые районы освобождены.",
			10
		]);
	} else {
		const elapsed = s.warElapsed || 1;
		const pStop = elapsed < 3 ? 0 : clamp(.04 + .035 * elapsed + (100 - camp.morale) / 350, 0, .55);
		if (rng() < pStop) {
			out.endWar = true;
			const lost = camp.occupied.length;
			out.impulses.push(makeImpulse("approvalPush", lost ? 1 : 3, `${DEF_ENEMY} согласилась на перемирие`, "fast", difficulty, "other"), makeImpulse("businessConfidence", 4, "Бои прекращены", "default", difficulty, "other"));
			out.news.push([
				"gov",
				`${DEF_ENEMY.toUpperCase()} ПРЕДЛАГАЕТ ПЕРЕМИРИЕ`,
				lost ? `Армия противника устала: Ашкала соглашается остановить бои и вывести войска из ${camp.occupied.map((id) => nameOf(id).gen).join(" и ")} в обмен на прекращение огня. ${warLasted(elapsed + 1)}` : `Армия противника устала: Ашкала соглашается остановить бои по линии границы. ${warLasted(elapsed + 1)}`,
				10
			]);
		}
	}
	camp.last = {
		target,
		stance: stance.id,
		hit,
		gain: Math.round(gain),
		pushed: Math.round(pushed),
		feint
	};
	camp.next = defenseTarget(camp);
	out.campaign = camp;
	return out;
}
// src/lib/world/regions.js
const MAP_REGIONS = [
	{
		id: "capital",
		name: "Велеградский столичный округ",
		short: "Велеградский",
		city: "Велеград",
		loc: "Велеградском столичном округе",
		gen: "Велеградского столичного округа",
		sector: "Управление",
		icon: "capital",
		lean: -6,
		weights: {
			politicalTension: .5,
			bankingRisk: .2,
			debtRisk: .3
		}
	},
	{
		id: "port",
		name: "Янтарская область",
		short: "Янтарская",
		city: "Янтарск",
		loc: "Янтарской области",
		gen: "Янтарской области",
		sector: "Внешняя торговля",
		icon: "port",
		lean: -2,
		weights: {
			currencyRisk: .55,
			recessionRisk: .25,
			debtRisk: .2
		}
	},
	{
		id: "industry",
		name: "Литейская область",
		short: "Литейская",
		city: "Литейск",
		loc: "Литейской области",
		gen: "Литейской области",
		sector: "Промышленность",
		icon: "industry",
		lean: -3,
		weights: {
			recessionRisk: .5,
			inflationRisk: .2,
			bankingRisk: .3
		}
	},
	{
		id: "agri",
		name: "Приреченская область",
		short: "Приреченская",
		city: "Приреченск",
		loc: "Приреченской области",
		gen: "Приреченской области",
		sector: "Сельское хозяйство",
		icon: "agri",
		lean: 6,
		weights: {
			inflationRisk: .6,
			recessionRisk: .2,
			currencyRisk: .2
		}
	},
	{
		id: "finance",
		name: "Златоградская область",
		short: "Златоградская",
		city: "Златоград",
		loc: "Златоградской области",
		gen: "Златоградской области",
		sector: "Финансы",
		icon: "finance",
		lean: -1,
		weights: {
			bankingRisk: .45,
			debtRisk: .35,
			currencyRisk: .2
		}
	},
	{
		id: "mining",
		name: "Рудногорская область",
		short: "Рудногорская",
		city: "Рудногорск",
		loc: "Рудногорской области",
		gen: "Рудногорской области",
		sector: "Добыча и энергетика",
		icon: "mining",
		lean: 2,
		weights: {
			inflationRisk: .35,
			recessionRisk: .35,
			bankingRisk: .3
		}
	},
	{
		id: "periphery",
		name: "Боровская область",
		short: "Боровская",
		city: "Боровец",
		loc: "Боровской области",
		gen: "Боровской области",
		sector: "Лес, село и услуги",
		icon: "periphery",
		lean: 7,
		weights: {
			politicalTension: .2,
			recessionRisk: .3,
			inflationRisk: .2,
			currencyRisk: .3
		}
	}
];
const ANNEX_REGIONS = [
	{
		id: "pereval",
		objective: "pass",
		name: "Перевальский район",
		short: "Перевальский",
		city: "Перевальск",
		loc: "Перевальском районе",
		gen: "Перевальского района",
		sector: "Горный транзит",
		icon: "pereval",
		lean: -4,
		annex: true,
		loyalty0: 22,
		weights: {
			politicalTension: .4,
			recessionRisk: .3,
			currencyRisk: .3
		}
	},
	{
		id: "halvik",
		objective: "mines",
		name: "Хальвикский край",
		short: "Хальвикский",
		city: "Хальвик",
		loc: "Хальвикском крае",
		gen: "Хальвикского края",
		sector: "Рудники",
		icon: "halvik",
		lean: -3,
		annex: true,
		loyalty0: 18,
		weights: {
			inflationRisk: .35,
			recessionRisk: .35,
			bankingRisk: .3
		}
	},
	{
		id: "nordholm",
		objective: "city",
		name: "Нордхольмская область",
		short: "Нордхольмская",
		city: "Нордхольм",
		loc: "Нордхольмской области",
		gen: "Нордхольмской области",
		sector: "Бывшая столица Норланда",
		icon: "nordholm",
		lean: -9,
		annex: true,
		loyalty0: 8,
		weights: {
			politicalTension: .5,
			recessionRisk: .25,
			inflationRisk: .25
		}
	}
];
const ALL_REGIONS = [...MAP_REGIONS, ...ANNEX_REGIONS];
const REGION_BY_ID = Object.fromEntries(ALL_REGIONS.map((r) => [r.id, r]));
const regionById = (id) => REGION_BY_ID[id] || null;
const ANNEX_REGION_OF = Object.fromEntries(ANNEX_REGIONS.map((r) => [r.objective, r.id]));
const INTEGRATION_COST = .08;
const activeRegions = (s) => [...MAP_REGIONS, ...ANNEX_REGIONS.filter((r) => (s.annexed || []).includes(r.objective))];
const votingRegions = (s) => activeRegions(s).filter((r) => !r.annex || (s.annexIntegrated || []).includes(r.id));
const annexLoyalty = (s, id) => {
	const v = (s.annexLoyalty || {})[id];
	return Number.isFinite(v) ? v : (regionById(id) || {}).loyalty0 || 0;
};
function regionStress(region, economy) {
	const fields = {
		politicalTension: clamp(economy.politicalTension || 0, 0, 100),
		bankingRisk: clamp(economy.bankingRisk || 0, 0, 100),
		debtRisk: clamp(economy.debtRisk || 0, 0, 100),
		currencyRisk: clamp(economy.currencyRisk || 0, 0, 100),
		recessionRisk: clamp(economy.recessionRisk || 0, 0, 100),
		inflationRisk: clamp(economy.inflationRisk || 0, 0, 100)
	};
	let sum = 0;
	let wsum = 0;
	Object.entries(region.weights).forEach(([k, w]) => {
		sum += (fields[k] || 0) * w;
		wsum += w;
	});
	const base = wsum > 0 ? sum / wsum : 0;
	const built = (economy.regionMods || {})[region.id] || 0;
	const shock = (economy.regionShock || {})[region.id] || 0;
	const building = (economy.projects || []).some((x) => x.region === region.id) ? -4 : 0;
	const war = (economy.warQuartersLeft || 0) > 0 ? warFrontRegion(economy) === region.id ? 22 : 5 : 0;
	const unrest = region.annex ? Math.max(0, 60 - annexLoyalty(economy, region.id)) * .75 : 0;
	const firms = ((economy.firmStress || {})[region.id] || 0) - ((economy.firmBoost || {})[region.id] || 0);
	return clamp(base + built + shock + building + war + unrest + firms, 0, 100);
}
const WAR_FRONT_REGION = {
	defensive: "agri",
	offensive: "mining"
};
function warFrontRegion(economy) {
	if (!((economy.warQuartersLeft || 0) > 0)) return null;
	if (economy.warType === "revanche") return economy.revancheCampaign && economy.revancheCampaign.next || null;
	if (economy.warType === "defensive" && economy.defenseCampaign) return economy.defenseCampaign.next || economy.defenseCampaign.occupied[0] || null;
	if (economy.warType === "offensive") return WAR_TARGETS[warTargetOf(economy)].front;
	return WAR_FRONT_REGION[economy.warType] || WAR_FRONT_REGION.defensive;
}
const REGION_PROJECTS = [
	{
		id: "metro",
		region: "capital",
		name: "Велеградское метро",
		doneHeadline: "ОТКРЫТО ВЕЛЕГРАДСКОЕ МЕТРО",
		quarters: 8,
		cost: .35,
		relief: 12,
		effect: "Инфраструктура и доверие к власти: столица видит результат каждый день.",
		done: (d) => [makeImpulse("infrastructureIndex", 2.5, "Открыто велеградское метро", "fast", d, "other"), makeImpulse("approvalPush", 2.5, "Открыто велеградское метро", "fast", d, "other")]
	},
	{
		id: "deepport",
		region: "port",
		name: "Глубоководный порт",
		doneHeadline: "ОТКРЫТ ГЛУБОКОВОДНЫЙ ПОРТ В ЯНТАРСКЕ",
		quarters: 6,
		cost: .3,
		relief: 12,
		effect: "Экспорт растёт: к причалам встают суда, которые раньше шли к соседям.",
		done: (d) => [sustainedImpulse("exportsGrowth", 1.2, 4, "Глубоководный порт принимает крупные суда"), makeImpulse("infrastructureIndex", 1.5, "Глубоководный порт", "fast", d, "other")]
	},
	{
		id: "factories",
		region: "industry",
		name: "Модернизация заводов",
		doneHeadline: "ЗАВОДЫ КУЗНЕЦКА МОДЕРНИЗИРОВАНЫ",
		quarters: 6,
		cost: .3,
		relief: 12,
		effect: "Производительность: новые станки выпускают больше тем же числом рук.",
		done: (d) => [makeImpulse("productivity", 1.6, "Заводы Литейской области модернизированы", "slow", d, "other")]
	},
	{
		id: "irrigation",
		region: "agri",
		name: "Ирригация и элеваторы",
		doneHeadline: "ИРРИГАЦИЯ И ЭЛЕВАТОРЫ ПРИРЕЧЬЯ ГОТОВЫ",
		quarters: 4,
		cost: .2,
		relief: 12,
		effect: "Дешевле продовольствие: урожай меньше зависит от погоды и доезжает до города.",
		done: (d) => [makeImpulse("inflationSupply", -.35, "Ирригация Приреченской области снижает цены на продовольствие", "slow", d, "other")]
	},
	{
		id: "powerplant",
		region: "mining",
		name: "Новая электростанция",
		doneHeadline: "НОВАЯ ЭЛЕКТРОСТАНЦИЯ ДАЛА ТОК",
		quarters: 8,
		cost: .4,
		relief: 12,
		effect: "Дешевле энергия для всей страны: ниже издержки и инфляция предложения.",
		done: (d) => [makeImpulse("inflationSupply", -.45, "Новая электростанция удешевляет энергию", "slow", d, "other"), makeImpulse("infrastructureIndex", 1.5, "Новая электростанция", "fast", d, "other")]
	},
	{
		id: "techpark",
		region: "finance",
		name: "Технопарк при бирже",
		doneHeadline: "ОТКРЫТ ТЕХНОПАРК ЗЛАТОГРАДА",
		quarters: 5,
		cost: .25,
		relief: 10,
		effect: "Производительность и доверие бизнеса: деньги и идеи находят друг друга.",
		done: (d) => [makeImpulse("productivity", 1, "Открыт технопарк Златограда", "slow", d, "other"), makeImpulse("businessConfidence", 4, "Открыт технопарк Златограда", "default", d, "other")]
	},
	{
		id: "railway",
		region: "periphery",
		name: "Железная дорога на Боровец",
		doneHeadline: "ЖЕЛЕЗНАЯ ДОРОГА ДОШЛА ДО БОРОВЦА",
		quarters: 7,
		cost: .3,
		relief: 14,
		effect: "Боровская область перестаёт пустеть: работа и рынки становятся ближе.",
		done: (d) => [makeImpulse("infrastructureIndex", 2.2, "Железная дорога дошла до Боровца", "fast", d, "other"), makeImpulse("laborForce", .25, "Боровская область перестаёт пустеть", "slow", d, "other")]
	},
	{
		id: "tunnel",
		region: "pereval",
		name: "Тоннель под перевалом",
		doneHeadline: "ОТКРЫТ ТОННЕЛЬ ПОД ПЕРЕВАЛОМ",
		quarters: 6,
		cost: .3,
		relief: 12,
		effect: "Перевал проходим круглый год: транзит и экспорт, а район — часть страны не только на карте.",
		done: (d) => [makeImpulse("infrastructureIndex", 1.5, "Открыт тоннель под перевалом", "fast", d, "other"), sustainedImpulse("exportsGrowth", .8, 4, "Транзит через тоннель")]
	},
	{
		id: "halvik_mines",
		region: "halvik",
		name: "Модернизация Хальвикских копей",
		doneHeadline: "ХАЛЬВИКСКИЕ КОПИ МОДЕРНИЗИРОВАНЫ",
		quarters: 5,
		cost: .3,
		relief: 10,
		effect: "Новые шахты и обогатительная фабрика: больше руды на экспорт и работа для края.",
		done: (d) => [sustainedImpulse("exportsGrowth", 1, 6, "Модернизированные копи Хальвика"), makeImpulse("inflationSupply", -.2, "Руда Хальвика дешевеет", "slow", d, "other")]
	},
	{
		id: "nordholm_rebuild",
		region: "nordholm",
		name: "Восстановление Нордхольма",
		doneHeadline: "НОРДХОЛЬМ ВОССТАНОВЛЕН",
		quarters: 8,
		cost: .4,
		relief: 14,
		effect: "Город отстраивают после войны: лучший довод для тех, кто ещё ждёт возвращения Норланда.",
		done: (d) => [makeImpulse("approvalPush", 1, "Нордхольм восстановлен", "fast", d, "other"), makeImpulse("laborForce", .2, "Нордхольм снова живёт", "slow", d, "other")]
	}
];
const PROJECT_BY_ID = Object.fromEntries(REGION_PROJECTS.map((p) => [p.id, p]));
function projectBlocker(p, s) {
	if (!p) return "такой стройки нет";
	if (!activeRegions(s).some((r) => r.id === p.region)) return "эта земля не в составе страны";
	if ((s.projectsBuilt || []).includes(p.id)) return "уже завершено";
	const active = s.projects || [];
	if (active.some((x) => x.id === p.id)) return "уже строится";
	if (active.length >= 3) return `одновременно — не больше 3 строек`;
	if ((s.marketLockoutQuartersLeft || 0) > 0 || s.imfActive) return "бюджет без доступа к рынку: большие стройки заморожены";
	return null;
}
const projectRamp = (x) => x.left === x.total || x.left === 1 ? .6 : 1;
const projectSpendPct = (projects) => (projects || []).reduce((a, x) => a + (PROJECT_BY_ID[x.id] || { cost: 0 }).cost * projectRamp(x), 0);
const REGION_EVENTS = [
	{
		id: "miners_strike",
		region: "mining",
		title: "Забастовка шахтёров",
		text: (s) => `Горняки Рудногорска остановили добычу: при инфляции ${fmt1(s.inflation)}% зарплата не покрывает жизнь. Профсоюз требует индексации.`,
		weight: (s) => 1 + .12 * Math.max(0, s.inflation - 5) + .3 * Math.max(0, s.unemployment - 6),
		defaultOption: "wait",
		options: [
			{
				id: "pay",
				tone: "generous",
				label: "Проиндексировать зарплаты горнякам",
				spend: .15,
				shock: -12,
				effect: "Добыча возобновится, но индексация разгоняет цены.",
				impulses: (s, d) => [makeImpulse("inflationSupply", .15, "Индексация зарплат шахтёрам", "slow", d, "other"), makeImpulse("approvalPush", 1, "Требования шахтёров выполнены", "fast", d, "other")]
			},
			{
				id: "talks",
				tone: "cheap",
				label: "Переговоры и обещания",
				spend: .03,
				shock: -4,
				effect: "Дёшево, но обещания придётся выполнять — иначе забастовка вернётся.",
				impulses: (s, d) => [makeImpulse("tensionPush", 1, "Шахтёрам дали обещания", "fast", d, "other")]
			},
			{
				id: "crush",
				tone: "hard",
				label: "Разогнать пикеты",
				spend: 0,
				shock: -6,
				effect: "Шахты заработают, но страна запомнит дубинки.",
				impulses: (s, d) => [
					makeImpulse("tensionPush", 4, "Разгон забастовки шахтёров", "fast", d, "other"),
					makeImpulse("approvalPush", -3, "Разгон забастовки шахтёров", "fast", d, "other"),
					makeImpulse("govTrust", -3, "Разгон забастовки шахтёров", "default", d, "other")
				]
			},
			{
				id: "wait",
				tone: "wait",
				label: "Переждать",
				spend: 0,
				shock: 12,
				effect: "Добыча стоит, энергия дорожает, забастовка расползается.",
				impulses: (s, d) => [
					makeImpulse("inflationSupply", .25, "Шахты стоят: энергия дорожает", "default", d, "other"),
					makeImpulse("exportsGrowth", -1.5, "Шахты стоят", "default", d, "other"),
					makeImpulse("tensionPush", 2.5, "Забастовка шахтёров расползается", "fast", d, "other")
				]
			}
		]
	},
	{
		id: "drought",
		region: "agri",
		title: "Засуха и неурожай",
		text: () => "В Приреченской области засуха: урожай на треть ниже прошлогоднего, хозяйства просят помощи, а в городах начинают дорожать хлеб и крупа.",
		weight: () => 1.1,
		defaultOption: "wait",
		options: [
			{
				id: "import",
				tone: "cheap",
				label: "Закупить зерно за рубежом",
				spend: .08,
				shock: -5,
				effect: "Цены не взлетят, но деньги уйдут соседям, а не своим фермерам.",
				impulses: (s, d) => [makeImpulse("importsGrowth", 2, "Закупки зерна за рубежом", "fast", d, "other")]
			},
			{
				id: "subsidy",
				tone: "generous",
				label: "Субсидировать фермеров",
				spend: .15,
				shock: -12,
				effect: "Хозяйства переживут год, а цены вырастут умеренно.",
				impulses: (s, d) => [makeImpulse("inflationSupply", .15, "Неурожай: цены на продовольствие", "default", d, "other")]
			},
			{
				id: "wait",
				tone: "wait",
				label: "Пусть рынок разберётся",
				spend: 0,
				shock: 10,
				effect: "Продовольствие заметно дорожает, село злится.",
				impulses: (s, d) => [makeImpulse("inflationSupply", .6, "Неурожай: продовольствие дорожает", "default", d, "other"), makeImpulse("approvalPush", -1.5, "Неурожай и дорогой хлеб", "fast", d, "other")]
			}
		]
	},
	{
		id: "port_accident",
		region: "port",
		title: "Авария в порту",
		text: () => "В Янтарске обрушился старый причал: треть терминалов закрыта, суда уходят на рейд или к соседям.",
		weight: (s) => .8 + .01 * (s.currencyRisk || 0),
		defaultOption: "wait",
		options: [
			{
				id: "repair",
				tone: "generous",
				label: "Срочный ремонт за счёт бюджета",
				spend: .12,
				shock: -7,
				effect: "Через квартал порт работает в полную силу.",
				impulses: (s, d) => [makeImpulse("exportsGrowth", .5, "Порт быстро восстановлен", "fast", d, "other")]
			},
			{
				id: "concession",
				tone: "cheap",
				label: "Отдать терминал в концессию",
				spend: 0,
				shock: 3,
				effect: "Ремонт за счёт инвестора: бизнес доволен, портовики — нет.",
				impulses: (s, d) => [makeImpulse("businessConfidence", 2.5, "Порт отдан в концессию", "default", d, "other"), makeImpulse("fdi", 1, "Порт отдан в концессию", "default", d, "other")]
			},
			{
				id: "wait",
				tone: "wait",
				label: "Чинить в плановом порядке",
				spend: 0,
				shock: 8,
				effect: "Экспорт проседает на несколько кварталов.",
				impulses: (s, d) => [makeImpulse("exportsGrowth", -2.5, "Порт работает вполсилы", "default", d, "other")]
			}
		]
	},
	{
		id: "bank_panic",
		region: "finance",
		title: "Паника вкладчиков в Златограде",
		text: (s) => `У отделений местного банка очереди: слух о его проблемах разошёлся быстрее опровержения. Банковский риск по стране ${Math.round(s.bankingRisk || 0)} из 100.`,
		weight: (s) => .5 + .03 * Math.max(0, (s.bankingRisk || 0) - 25),
		defaultOption: "wait",
		options: [
			{
				id: "guarantee",
				tone: "generous",
				label: "Гарантировать вклады",
				spend: .1,
				shock: -9,
				effect: "Очереди расходятся, доверие к банкам цело.",
				impulses: (s, d) => [makeImpulse("riskPremium", -.05, "Вклады в Златограде гарантированы", "fast", d, "other"), makeImpulse("consumerConfidence", 1.5, "Вклады гарантированы", "fast", d, "other")]
			},
			{
				id: "bail_in",
				tone: "cheap",
				label: "Санировать за счёт акционеров",
				spend: 0,
				shock: 3,
				effect: "Бюджет цел, но инвесторы запомнят, что держать акции банков опасно.",
				impulses: (s, d) => [makeImpulse("stockShock", -2, "Санация банка за счёт акционеров", "fast", d, "other"), makeImpulse("businessConfidence", -1.5, "Санация банка за счёт акционеров", "default", d, "other")]
			},
			{
				id: "wait",
				tone: "wait",
				label: "Не вмешиваться",
				spend: 0,
				shock: 10,
				effect: "Банк лопается, паника перекидывается на соседей.",
				impulses: (s, d) => [makeImpulse("consumerConfidence", -3, "Лопнул банк в Златограде", "fast", d, "other"), makeImpulse("riskPremium", .12, "Лопнул банк в Златограде", "default", d, "other")]
			}
		]
	},
	{
		id: "plant_closure",
		region: "industry",
		title: "Закрывается градообразующий завод",
		text: (s) => `Литейский машиностроительный объявил о закрытии: заказов нет, кредит дорог (ставка ${fmt1(s.keyRate)}%). Без работы останутся тысячи людей.`,
		weight: (s) => .6 + .35 * Math.max(0, -(s.outputGap || 0)) + .05 * Math.max(0, (s.keyRate || 0) - 8),
		defaultOption: "wait",
		options: [
			{
				id: "order",
				tone: "generous",
				label: "Дать заводу госзаказ",
				spend: .15,
				shock: -12,
				effect: "Завод работает, город спокоен — пока не кончится заказ.",
				impulses: () => []
			},
			{
				id: "retrain",
				tone: "cheap",
				label: "Переобучение и пособия",
				spend: .06,
				shock: -4,
				effect: "Люди переходят в новые отрасли — медленно, зато навсегда.",
				impulses: (s, d) => [makeImpulse("productivity", .3, "Переобучение рабочих Литейска", "slow", d, "other")]
			},
			{
				id: "wait",
				tone: "wait",
				label: "Не мешать рынку",
				spend: 0,
				shock: 10,
				effect: "Безработица в поясе растёт, рейтинг власти падает.",
				impulses: (s, d) => [makeImpulse("unemployment", .25, "Закрыт завод в Литейске", "default", d, "other"), makeImpulse("approvalPush", -1, "Закрыт завод в Литейске", "fast", d, "other")]
			}
		]
	},
	{
		id: "capital_rally",
		region: "capital",
		title: "Митинг у стен правительства",
		text: (s) => s.politicalRegime === "authoritarian" ? `У здания правительства — несогласованная акция. Власти призывают граждан не поддаваться на провокации; напряжённость ${Math.round(s.politicalTension || 0)} из 100.` : `На площади перед правительством десятки тысяч человек. Одобрение власти ${Math.round(s.approval)} из 100, напряжённость ${Math.round(s.politicalTension || 0)} из 100.`,
		weight: (s) => .3 + .03 * Math.max(0, (s.politicalTension || 0) - 30) + .03 * Math.max(0, 50 - (s.approval || 50)),
		eligible: (s) => s.politicalRegime !== "totalitarian",
		defaultOption: "allow",
		options: [
			{
				id: "meet",
				tone: "generous",
				label: "Выйти к людям",
				spend: 0,
				shock: -8,
				effect: "Разговор вместо оцепления — рейтинг растёт, если есть что сказать.",
				impulses: (s, d) => [makeImpulse("approvalPush", 2, "Власть вышла к митингующим", "fast", d, "other"), makeImpulse("tensionPush", -2, "Власть вышла к митингующим", "fast", d, "other")]
			},
			{
				id: "allow",
				tone: "cheap",
				label: "Разрешить и не мешать",
				spend: 0,
				shock: -2,
				effect: "Митинг проходит спокойно и расходится.",
				impulses: (s, d) => [makeImpulse("tensionPush", -1, "Митинг прошёл спокойно", "fast", d, "other")]
			},
			{
				id: "ban",
				tone: "hard",
				label: "Запретить митинг",
				spend: 0,
				shock: -4,
				effect: "Площадь пустеет, недовольство уходит внутрь.",
				impulses: (s, d) => [makeImpulse("tensionPush", 3, "Митинг запрещён", "fast", d, "other"), makeImpulse("govTrust", -2, "Митинг запрещён", "default", d, "other")]
			}
		]
	},
	{
		id: "wildfire",
		region: "periphery",
		title: "Лесные пожары под Боровцом",
		text: () => "Горят боровские леса: огонь подходит к посёлкам, дым висит над Боровцом вторую неделю.",
		weight: (s, q) => .5 + ((q % 4 + 4) % 4 === 2 || (q % 4 + 4) % 4 === 3 ? .6 : 0),
		defaultOption: "regional",
		options: [{
			id: "army",
			tone: "generous",
			label: "Бросить армию и авиацию",
			spend: .08,
			shock: -8,
			effect: "Огонь сбит за неделю, область видит, что о ней помнят.",
			impulses: (s, d) => [makeImpulse("approvalPush", 1, "Пожары под Боровцом потушены", "fast", d, "other")]
		}, {
			id: "regional",
			tone: "wait",
			label: "Пусть справляется область",
			spend: 0,
			shock: 9,
			effect: "Посёлки горят, Боровская область снова чувствует себя забытой.",
			impulses: (s, d) => [makeImpulse("approvalPush", -1.5, "Боровскую область оставили один на один с пожарами", "fast", d, "other")]
		}]
	},
	{
		id: "youth_exodus",
		region: "periphery",
		title: "Молодёжь уезжает из Боровской области",
		text: () => "Школы Боровской области выпускают больше, чем остаётся: молодые семьи уезжают в столицу и за границу.",
		weight: (s) => .3 + .2 * Math.max(0, (s.unemployment || 0) - 6),
		defaultOption: "wait",
		options: [{
			id: "grants",
			tone: "generous",
			label: "Подъёмные и жильё для молодых",
			spend: .06,
			shock: -7,
			effect: "Часть семей остаётся — область стареет медленнее.",
			impulses: () => []
		}, {
			id: "wait",
			tone: "wait",
			label: "Ничего не делать",
			spend: 0,
			shock: 5,
			effect: "Рабочих рук в стране становится чуть меньше.",
			impulses: (s, d) => [makeImpulse("laborForce", -.15, "Отток из Боровской области", "slow", d, "other")]
		}]
	},
	{
		id: "nordholm_underground",
		region: "nordholm",
		title: "Подполье в Нордхольме",
		text: (s) => `В Нордхольме раскрыта подпольная сеть: листовки, склады оружия, списки «пособников». Лояльность области ${Math.round(annexLoyalty(s, "nordholm"))} из 100.`,
		eligible: (s) => (s.annexed || []).includes("city"),
		weight: (s) => .6 + Math.max(0, 50 - annexLoyalty(s, "nordholm")) / 30,
		defaultOption: "wait",
		options: [
			{
				id: "amnesty",
				tone: "generous",
				label: "Амнистия тем, кто сдаст оружие",
				spend: .06,
				shock: -8,
				loyalty: 10,
				effect: "Часть подполья выходит из тени; в столице ворчат о мягкости.",
				impulses: (s, d) => [makeImpulse("approvalPush", -.5, "Амнистия подпольщикам Нордхольма", "fast", d, "other")]
			},
			{
				id: "sweep",
				tone: "hard",
				label: "Зачистка кварталов",
				spend: .03,
				shock: -4,
				loyalty: -8,
				effect: "Сеть разгромлена, но каждый обыск рождает новых подпольщиков.",
				impulses: (s, d) => [makeImpulse("tensionPush", 2, "Зачистка в Нордхольме", "fast", d, "other")]
			},
			{
				id: "wait",
				tone: "wait",
				label: "Наблюдать",
				spend: 0,
				shock: 8,
				loyalty: -4,
				effect: "Подполье растёт и готовит следующий удар.",
				impulses: (s, d) => [makeImpulse("tensionPush", 1.5, "Подполье в Нордхольме растёт", "fast", d, "other")]
			}
		]
	},
	{
		id: "halvik_schools",
		region: "halvik",
		title: "Школы на норландском языке",
		text: () => "Родители в Хальвике требуют оставить школы на норландском языке. Министерство образования готовит единую программу для всей страны.",
		eligible: (s) => (s.annexed || []).includes("mines"),
		weight: () => .9,
		defaultOption: "wait",
		options: [
			{
				id: "allow",
				tone: "generous",
				label: "Оставить школы на родном языке",
				spend: .02,
				shock: -6,
				loyalty: 9,
				effect: "Край успокаивается; националисты в столице недовольны.",
				impulses: (s, d) => [makeImpulse("approvalPush", -.6, "Уступка хальвикским школам", "fast", d, "other")]
			},
			{
				id: "ban",
				tone: "hard",
				label: "Единая программа для всех",
				spend: 0,
				shock: 5,
				loyalty: -10,
				effect: "Одна страна — одна школа; край запомнит.",
				impulses: (s, d) => [makeImpulse("tensionPush", 1, "Хальвикские школы закрыты", "fast", d, "other")]
			},
			{
				id: "wait",
				tone: "wait",
				label: "Отложить решение",
				spend: 0,
				shock: 4,
				loyalty: -3,
				effect: "Вопрос висит, и обе стороны считают, что их не слышат.",
				impulses: () => []
			}
		]
	},
	{
		id: "pereval_smuggling",
		region: "pereval",
		title: "Контрабанда через перевал",
		text: () => "Через перевал идут фуры без документов: старые норландские связи работают лучше новых таможен.",
		eligible: (s) => (s.annexed || []).includes("pass"),
		weight: () => .8,
		defaultOption: "wait",
		options: [
			{
				id: "customs",
				tone: "hard",
				label: "Закрыть перевал таможней",
				spend: .05,
				shock: 3,
				loyalty: -5,
				effect: "Бюджет получает пошлины, район теряет заработок.",
				impulses: (s, d) => [makeImpulse("importsGrowth", -.6, "Таможня на перевале", "fast", d, "other")]
			},
			{
				id: "legalize",
				tone: "generous",
				label: "Легализовать приграничную торговлю",
				spend: 0,
				shock: -6,
				loyalty: 7,
				effect: "Торговля выходит из тени, а район — из подполья.",
				impulses: (s, d) => [makeImpulse("importsGrowth", .8, "Приграничная торговля на перевале", "fast", d, "other")]
			},
			{
				id: "wait",
				tone: "wait",
				label: "Закрывать глаза",
				spend: 0,
				shock: 2,
				loyalty: 0,
				effect: "Всё идёт как шло: мимо бюджета.",
				impulses: () => []
			}
		]
	}
];
const REGION_EVENT_BY_ID = Object.fromEntries(REGION_EVENTS.map((e) => [e.id, e]));
const PRESIDENT_EVENTS = /* @__PURE__ */ new Set([
	"capital_rally",
	"wildfire",
	"nordholm_underground",
	"halvik_schools"
]);
const regionEventOwner = (id) => PRESIDENT_EVENTS.has(id) ? "president" : "government";
function botPresidentRegion(s, personaId = "technocrat") {
	const ev = s.regionEvent ? REGION_EVENT_BY_ID[s.regionEvent.id] : null;
	if (!ev || regionEventOwner(ev.id) !== "president") return null;
	const byTone = (t) => ev.options.find((o) => o.tone === t);
	return ((personaId === "strongman" ? byTone("hard") || byTone("generous") : personaId === "technocrat" ? byTone("cheap") || byTone("generous") : byTone("generous") || byTone("cheap")) || ev.options.find((o) => o.id === ev.defaultOption)).id;
}
function publicRegionEvent(ev, s, q) {
	return {
		id: ev.id,
		region: ev.region,
		title: ev.title,
		text: ev.text(s),
		q,
		defaultOption: ev.defaultOption,
		owner: regionEventOwner(ev.id),
		options: ev.options.map((o) => ({
			id: o.id,
			label: o.label,
			effect: o.effect,
			spend: o.spend,
			shock: o.shock,
			tone: o.tone,
			loyalty: o.loyalty || 0
		}))
	};
}
function regionStep(s, decisions, difficulty, quarterIndex, noEvents = false) {
	const out = {
		impulses: [],
		news: [],
		eventPct: 0,
		loyaltyDelta: {}
	};
	const shock = {};
	Object.entries(s.regionShock || {}).forEach(([id, v]) => {
		const nv = v * .65;
		if (Math.abs(nv) >= .5) shock[id] = nv;
	});
	let resolution = null;
	const pend = s.regionEvent ? REGION_EVENT_BY_ID[s.regionEvent.id] : null;
	if (pend) {
		const chosen = pend.options.find((o) => o.id === decisions.regionResponse);
		const opt = chosen || pend.options.find((o) => o.id === pend.defaultOption);
		out.impulses.push(...opt.impulses(s, difficulty));
		out.eventPct += opt.spend;
		shock[pend.region] = (shock[pend.region] || 0) + opt.shock;
		if (opt.loyalty) out.loyaltyDelta[pend.region] = (out.loyaltyDelta[pend.region] || 0) + opt.loyalty;
		const region = regionById(pend.region);
		resolution = {
			id: pend.id,
			region: pend.region,
			title: pend.title,
			option: opt.id,
			label: opt.label,
			byDefault: !chosen,
			q: quarterIndex
		};
		out.news.push([
			"gov",
			`${region.name.toUpperCase()}: ${pend.title.toUpperCase()} — ${chosen ? opt.label.toUpperCase() : "РЕШЕНИЯ НЕ ПРИНЯЛИ"}`,
			`${chosen ? `Ответ власти: «${opt.label}».` : `Ответа так и не дали — вышло «${opt.label.toLowerCase()}».`} ${opt.effect}${opt.spend ? ` Стоимость — около ${fmt1(opt.spend)}% ВВП.` : ""}`,
			7
		]);
	}
	let projects = (s.projects || []).map((x) => ({ ...x }));
	const built = [...s.projectsBuilt || []];
	const mods = { ...s.regionMods };
	const startP = PROJECT_BY_ID[decisions.startProject];
	if (startP && !projectBlocker(startP, s)) {
		projects.push({
			id: startP.id,
			region: startP.region,
			left: startP.quarters,
			total: startP.quarters,
			startedQ: quarterIndex
		});
		const region = regionById(startP.region);
		out.news.push([
			"gov",
			`СТАРТ СТРОЙКИ: ${startP.name.toUpperCase()}`,
			`${region.name}: ${startP.name.toLowerCase()} — ${startP.quarters} кв. работ, около ${fmt1(startP.cost)}% ВВП в год из бюджета. ${startP.effect}`,
			6
		]);
	}
	const projectPct = projectSpendPct(projects);
	const still = [];
	projects.forEach((x) => {
		const left = x.left - 1;
		if (left > 0) {
			still.push({
				...x,
				left
			});
			return;
		}
		const p = PROJECT_BY_ID[x.id];
		built.push(x.id);
		mods[x.region] = (mods[x.region] || 0) - p.relief;
		out.impulses.push(...p.done(difficulty), makeImpulse("approvalPush", 1, `Сдан объект: ${p.name}`, "fast", difficulty, "other"));
		const region = regionById(x.region);
		if (region.annex) out.loyaltyDelta[x.region] = (out.loyaltyDelta[x.region] || 0) + 15;
		out.news.push([
			"gov",
			p.doneHeadline || `ЗАВЕРШЕНО: ${p.name.toUpperCase()}`,
			`${region.name}: работы завершены — «${p.name}». ${p.effect} Напряжение в области снижается надолго.`,
			8
		]);
	});
	projects = still;
	let cooldown = Math.max(0, (Number.isFinite(s.regionEventCooldown) ? s.regionEventCooldown : 1) - 1);
	let regionEvent = null;
	if (pend) cooldown = Math.max(cooldown, 1);
	if (!noEvents && !pend && cooldown === 0 && quarterIndex >= 3) {
		const pool = REGION_EVENTS.filter((e) => !e.eligible || e.eligible(s));
		const stressOf = (id) => regionStress(regionById(id), s);
		const maxStress = Math.max(...activeRegions(s).map((r) => stressOf(r.id)));
		if (pool.length && rng() < clamp(.22 + .004 * maxStress, .22, .55)) {
			const weights = pool.map((e) => Math.max(.05, e.weight(s, quarterIndex)) * (1 + stressOf(e.region) / 50));
			let r = rng() * weights.reduce((a, b) => a + b, 0);
			const ev = pool.find((e, i) => {
				r -= weights[i];
				return r <= 0;
			}) || pool[pool.length - 1];
			regionEvent = publicRegionEvent(ev, s, quarterIndex);
			cooldown = 2;
			const region = regionById(ev.region);
			out.news.push([
				"crisis",
				`${region.name.toUpperCase()}: ${ev.title.toUpperCase()}`,
				`${regionEvent.text} Решение — за ${regionEventOwner(ev.id) === "president" ? "президентом" : "правительством"}: ответ нужен в следующем квартале.`,
				8
			]);
		}
	}
	return {
		...out,
		projects,
		projectsBuilt: built,
		regionMods: mods,
		regionShock: shock,
		regionEvent,
		regionEventCooldown: cooldown,
		lastRegionResolution: resolution || s.lastRegionResolution || null,
		projectPct
	};
}
function botRegionPlan(s, P, consolidationNeed) {
	const plan = {
		startProject: null,
		regionResponse: null
	};
	const active = (s.projects || []).length;
	const limit = P.investBias >= 1.2 ? 2 : 1;
	const room = consolidationNeed < .5 || s.outputGap < -2 && P.id !== "austerity";
	if (active < limit && room) {
		const cands = REGION_PROJECTS.filter((p) => !projectBlocker(p, s)).map((p) => ({
			p,
			stress: regionStress(regionById(p.region), s)
		})).sort((a, b) => b.stress - a.stress);
		if (cands.length) plan.startProject = cands[0].p.id;
	}
	const ev = s.regionEvent ? REGION_EVENT_BY_ID[s.regionEvent.id] : null;
	if (ev) {
		const byTone = (t) => ev.options.find((o) => o.tone === t);
		const stress = regionStress(regionById(ev.region), s);
		plan.regionResponse = ((P.id === "populist" ? byTone("generous") || byTone("cheap") : P.id === "austerity" ? byTone("cheap") || byTone("wait") : (stress >= 45 ? byTone("generous") : byTone("cheap")) || byTone("generous")) || ev.options.find((o) => o.id === ev.defaultOption)).id;
	}
	if (s.groupDemand) {
		const v = (s.groupSupport || {})[s.groupDemand.group] ?? 40;
		plan.groupResponse = P.id === "populist" ? "concede" : P.id === "austerity" ? "promise" : v < 32 ? "concede" : "promise";
	}
	const annex = activeRegions(s).filter((r) => r.annex && annexLoyalty(s, r.id) < 70).sort((a, b) => annexLoyalty(s, a.id) - annexLoyalty(s, b.id));
	plan.integrate = P.id === "populist" ? annex.map((r) => r.id) : P.id === "austerity" || consolidationNeed >= .8 ? annex.slice(0, 1).map((r) => r.id) : annex.map((r) => r.id);
	return plan;
}
// src/lib/politics/groups.js
const SOCIAL_GROUPS = [
	{
		id: "pensioners",
		name: "Пенсионеры",
		weight: .2,
		turnout: 1.5,
		icon: "pensioners",
		leader: {
			name: "Галина Воронцова",
			title: "председатель Союза пенсионеров"
		},
		wants: "Стабильные цены и индексацию пенсий и соцвыплат.",
		lost: "Выходят на улицы и приходят на выборы активнее всех: их недовольство сильнее всего бьёт по итогу голосования."
	},
	{
		id: "workers",
		name: "Рабочие",
		weight: .2,
		turnout: 1,
		icon: "workers",
		leader: {
			name: "Степан Грачёв",
			title: "лидер Федерации профсоюзов"
		},
		wants: "Работу, растущие реальные зарплаты и заказы заводам.",
		lost: "Бастуют: встают заводы и шахты, проседают выпуск и экспорт."
	},
	{
		id: "business",
		name: "Бизнес",
		weight: .12,
		turnout: 1,
		icon: "business",
		leader: {
			name: "Аркадий Левин",
			title: "глава Союза промышленников"
		},
		wants: "Низкие налоги и ставки, предсказуемые правила, никакой войны и произвола.",
		lost: "Выводит капитал и откладывает инвестиции: растёт премия за риск."
	},
	{
		id: "siloviki",
		name: "Силовики",
		weight: .08,
		turnout: 1,
		icon: "siloviki",
		leader: {
			name: "генерал Олег Рубцов",
			title: "начальник Генштаба"
		},
		wants: "Деньги на оборону, порядок и сильную руку.",
		lost: "Ропщут в казармах: риск военного переворота растёт в разы даже при терпимом рейтинге."
	},
	{
		id: "public",
		name: "Бюджетники",
		weight: .15,
		turnout: 1.1,
		icon: "public",
		leader: {
			name: "Нина Сомова",
			title: "председатель профсоюза учителей и врачей"
		},
		wants: "Зарплаты в бюджетной сфере, деньги на школы и больницы.",
		lost: "Учителя и врачи бастуют: падает доверие к государству."
	},
	{
		id: "youth",
		name: "Молодёжь",
		weight: .15,
		turnout: .6,
		icon: "youth",
		leader: {
			name: "Кира Лебедь",
			title: "лидер студенческого движения"
		},
		wants: "Работу, свободы и будущее — без войны и цензуры.",
		lost: "Протестует и уезжает: растёт напряжённость, страна теряет рабочие руки."
	},
	{
		id: "regions",
		name: "Регионы",
		weight: .1,
		turnout: 1.1,
		icon: "regions",
		leader: {
			name: "Павел Мирошник",
			title: "глава Ассоциации губернаторов"
		},
		wants: "Трансферты и стройки в областях, спокойствие на местах.",
		lost: "Губернаторы саботируют решения центра: растут напряжённость и недоверие."
	}
];
const ACTION_GROUP_EFFECTS = {
	address: {
		pensioners: 2,
		public: 1,
		regions: 1
	},
	elite_deal: {
		business: 8,
		regions: 6,
		siloviki: 4,
		youth: -6,
		workers: -3
	},
	anticorruption: {
		youth: 8,
		workers: 4,
		public: 3,
		business: -5,
		regions: -6,
		siloviki: -3
	},
	crackdown: {
		siloviki: 10,
		youth: -18,
		workers: -8,
		business: -4,
		public: -4
	},
	military_parade: {
		siloviki: 6,
		pensioners: 4,
		youth: -4
	},
	sanctions_impose: {
		siloviki: 4,
		business: -8,
		workers: -2
	},
	trade_bloc: {
		business: 8,
		youth: 4,
		workers: -3,
		siloviki: -3
	},
	dissolve: {
		siloviki: 6,
		youth: -15,
		business: -6,
		public: -4
	},
	restore_parliament: {
		youth: 10,
		business: 5,
		siloviki: -8
	},
	war_start: {
		siloviki: 14,
		pensioners: 3,
		youth: -14,
		business: -12,
		workers: -3
	},
	mobilization: {
		youth: -22,
		workers: -10,
		pensioners: -6,
		siloviki: 6
	},
	war_economy: {
		workers: 6,
		siloviki: 8,
		business: -10,
		youth: -3
	},
	peace_deal: {
		business: 8,
		youth: 8,
		siloviki: -10
	},
	seize_control: {
		siloviki: 10,
		youth: -20,
		business: -10,
		public: -6,
		regions: -4
	},
	labor: {
		business: 12,
		workers: -14,
		youth: 3
	},
	pension: {
		pensioners: -22,
		business: 6,
		youth: 4,
		public: -3
	},
	courts: {
		business: 8,
		youth: 5,
		siloviki: -6,
		regions: -3
	},
	deregulation: {
		business: 12,
		youth: 3,
		public: -6,
		regions: -2
	},
	education: {
		youth: 8,
		public: 6,
		pensioners: -2
	},
	infra_program: {
		regions: 12,
		workers: 6,
		business: 3
	}
};
const groupMemoryOf = (effects, text, quarters) => Object.entries(effects || {}).filter(([, v]) => v).map(([group, amount]) => ({
	group,
	amount,
	left: quarters,
	total: quarters,
	text
}));
function groupDrivers(id, x) {
	const infGap = Math.max(0, x.inflation - x.infTarget);
	const uGap = x.unemployment - x.nairu;
	const d = x.decisions || {};
	const sh = x.budgetShares || {};
	const num = (v, def) => Number.isFinite(v) ? v : def;
	const inc = groupRealIncome(x.distribution, id);
	const income = Number.isFinite(inc) ? [["Доходы слоя", clamp(.45 * inc, -6, 6)]] : [];
	return [...groupDriversBase(id, x, infGap, uGap, d, sh, num), ...income];
}
function groupDriversBase(id, x, infGap, uGap, d, sh, num) {
	switch (id) {
		case "pensioners": return [["Цены", -1.2 * infGap], ["Соцвыплаты", .7 * num(d.transfers, 0)]];
		case "workers": return [["Безработица", -1.8 * uGap], ["Реальные зарплаты", 1.2 * (x.wageGrowth - x.inflation - 2)]];
		case "business": return [
			["Ставка", -.7 * (num(d.keyRate, 5.5) - (x.infTarget + 2))],
			["Налог на прибыль", -.8 * (num(d.profitTaxRate, 20) - 20)],
			["Настроения бизнеса", .15 * (x.businessConfidence - 55)],
			["Война", x.offensiveWar ? -6 : 0],
			["Произвол", -8 * x.repression]
		];
		case "siloviki": return [
			["Оборона в бюджете", 1.2 * (num(sh.defense, 15) - 15)],
			["Сильная рука", 10 * x.repression],
			["Война", x.atWar ? 4 : 0]
		];
		case "public": return [
			["Госрасходы", .8 * num(d.govSpending, 0)],
			["Школы и больницы", .5 * (num(sh.health, 19) + num(sh.education, 16) - 35)],
			["Цены", -.8 * infGap]
		];
		case "youth": return [
			["Работа", -1.5 * uGap],
			["Свободы", -14 * x.repression],
			["Война", x.atWar ? -6 : 0]
		];
		case "regions": return [
			["Напряжение в областях", -.3 * (x.avgStress - 15)],
			["Соцвыплаты", .5 * num(d.transfers, 0)],
			["Стройки", 2 * x.projects]
		];
		default: return [];
	}
}
function groupStep(s, ctx) {
	const base = Number.isFinite(s.approval) ? s.approval : 55;
	const prev = s.groupSupport || {};
	const memory = [...(s.groupMemory || []).map((m) => m.wait > 0 ? {
		...m,
		wait: m.wait - 1
	} : {
		...m,
		left: m.left - 1
	}).filter((m) => m.left > 0), ...ctx.newMemory || []];
	const support = {};
	const drivers = {};
	const meanDev = SOCIAL_GROUPS.reduce((acc, g) => acc + g.weight * clamp(groupDrivers(g.id, ctx).reduce((x, [, v]) => x + v, 0), -25, 25), 0);
	SOCIAL_GROUPS.forEach((g) => {
		const parts = groupDrivers(g.id, ctx).filter(([, v]) => Math.abs(v) >= .05);
		drivers[g.id] = parts.map(([k, v]) => [k, Math.round(v * 10) / 10]);
		const dev = clamp(parts.reduce((a, [, v]) => a + v, 0) - .8 * meanDev, -25, 25);
		const mem = memory.filter((m) => m.group === g.id && !(m.wait > 0)).reduce((a, m) => a + m.amount * m.left / m.total, 0);
		const target = clamp(ctx.approvalTarget + dev + mem, 0, 100);
		support[g.id] = clamp(ema(Number.isFinite(prev[g.id]) ? prev[g.id] : base, target, .28) + (ctx.push || 0), 0, 100);
	});
	const approval = clamp(SOCIAL_GROUPS.reduce((a, g) => a + g.weight * support[g.id], 0), 0, 100);
	return {
		support,
		memory,
		drivers,
		approval,
		unrest: SOCIAL_GROUPS.reduce((a, g) => a + g.weight * Math.max(0, approval - 8 - support[g.id]), 0) * 1.2
	};
}
function groupTurnoutShift(s) {
	const sup = s.groupSupport;
	if (!sup) return 0;
	let tw = 0;
	let ts = 0;
	let plain = 0;
	SOCIAL_GROUPS.forEach((g) => {
		const v = Number.isFinite(sup[g.id]) ? sup[g.id] : 50;
		tw += g.weight * g.turnout;
		ts += g.weight * g.turnout * v;
		plain += g.weight * v;
	});
	return tw > 0 ? ts / tw - plain : 0;
}
const REGION_GROUP_MIX = {
	capital: {
		youth: .25,
		public: .2,
		business: .2,
		pensioners: .15,
		workers: .1,
		siloviki: .1
	},
	port: {
		workers: .3,
		business: .2,
		youth: .2,
		pensioners: .15,
		public: .1,
		regions: .05
	},
	industry: {
		workers: .45,
		pensioners: .2,
		public: .15,
		youth: .1,
		regions: .1
	},
	agri: {
		pensioners: .35,
		regions: .3,
		workers: .15,
		public: .15,
		youth: .05
	},
	finance: {
		business: .4,
		youth: .2,
		public: .15,
		pensioners: .15,
		workers: .1
	},
	mining: {
		workers: .45,
		regions: .2,
		pensioners: .15,
		siloviki: .1,
		public: .1
	},
	periphery: {
		pensioners: .35,
		regions: .3,
		public: .2,
		workers: .1,
		youth: .05
	}
};
const ANNEX_GROUP_MIX = {
	regions: .4,
	workers: .3,
	pensioners: .2,
	youth: .1
};
function regionGroupSupport(regionId, s) {
	const sup = s.groupSupport;
	if (!sup) return null;
	const mix = REGION_GROUP_MIX[regionId] || ANNEX_GROUP_MIX;
	return Object.entries(mix).reduce((a, [g, w]) => a + w * (Number.isFinite(sup[g]) ? sup[g] : 50), 0);
}
const GROUP_UNREST = {
	pensioners: {
		headline: "ПЕНСИОНЕРЫ ВЫШЛИ НА УЛИЦЫ",
		text: (g) => `${g.leader.name}, ${g.leader.title}: «Пенсия не поспевает за ценами. Мы помним, кто это допустил, — и придём на выборы».`,
		impulses: (d) => [makeImpulse("tensionPush", 2, "Протесты пенсионеров", "fast", d, "other")]
	},
	workers: {
		headline: "ЗАБАСТОВКА: ПРОФСОЮЗЫ ОСТАНОВИЛИ ЗАВОДЫ",
		text: (g) => `${g.leader.name}, ${g.leader.title}: «Работать за такие деньги — и при таких решениях — мы больше не будем».`,
		impulses: (d) => [makeImpulse("exportsGrowth", -.8, "Забастовка рабочих", "fast", d, "other"), makeImpulse("tensionPush", 2, "Забастовка рабочих", "fast", d, "other")]
	},
	business: {
		headline: "БИЗНЕС ВЫВОДИТ КАПИТАЛ",
		text: (g) => `${g.leader.name}, ${g.leader.title}: «Вкладываться туда, где правила меняются каждый квартал, никто не будет».`,
		impulses: (d) => [
			makeImpulse("capitalFlow", -8, "Бизнес выводит капитал", "fast", d),
			makeImpulse("riskPremium", .05, "Бизнес не верит власти", "fast", d),
			makeImpulse("businessConfidence", -3, "Бизнес не верит власти", "fast", d, "other")
		]
	},
	siloviki: {
		headline: "РОПОТ В ГЕНШТАБЕ",
		text: (g) => `${g.leader.name}, ${g.leader.title}, на закрытом совещании: «Армию держат впроголодь и не слушают. Долго так продолжаться не может».`,
		impulses: (d) => [makeImpulse("tensionPush", 1, "Недовольство силовиков", "fast", d, "other")]
	},
	public: {
		headline: "УЧИТЕЛЯ И ВРАЧИ БАСТУЮТ",
		text: (g) => `${g.leader.name}, ${g.leader.title}: «Школы и больницы держатся на нашем терпении. Оно кончилось».`,
		impulses: (d) => [makeImpulse("govTrust", -2, "Забастовка бюджетников", "default", d, "other"), makeImpulse("tensionPush", 1.5, "Забастовка бюджетников", "fast", d, "other")]
	},
	youth: {
		headline: "МОЛОДЁЖЬ ПРОТЕСТУЕТ — И УЕЗЖАЕТ",
		text: (g) => `${g.leader.name}, ${g.leader.title}: «Здесь нам не оставили ни работы, ни голоса. Кто не выходит на площадь — покупает билет».`,
		impulses: (d) => [makeImpulse("tensionPush", 3, "Протесты молодёжи", "fast", d, "other"), makeImpulse("laborForce", -.05, "Молодые уезжают", "slow", d, "other")]
	},
	regions: {
		headline: "ГУБЕРНАТОРЫ ПРОТИВ ЦЕНТРА",
		text: (g) => `${g.leader.name}, ${g.leader.title}: «Области забыты. Решения центра на местах исполнять некому и незачем».`,
		impulses: (d) => [makeImpulse("govTrust", -1, "Губернаторы против центра", "default", d, "other"), makeImpulse("tensionPush", 1, "Губернаторы против центра", "fast", d, "other")]
	}
};
function groupEpisodes(s, support, difficulty) {
	const out = {
		impulses: [],
		news: [],
		cd: {}
	};
	Object.entries(s.groupUnrestCd || {}).forEach(([id, v]) => {
		if (v > 1) out.cd[id] = v - 1;
	});
	const g = SOCIAL_GROUPS.filter((g) => support[g.id] < 35 && !out.cd[g.id]).sort((a, b) => support[a.id] - support[b.id])[0];
	if (g && rng() < .5) {
		const u = GROUP_UNREST[g.id];
		out.impulses.push(...u.impulses(difficulty));
		out.news.push([
			"crisis",
			u.headline,
			u.text(g),
			7
		]);
		out.cd[g.id] = 3;
	}
	return out;
}
const GROUP_DEMANDS = {
	pensioners: {
		title: "Пенсионеры требуют внеочередной индексации",
		concede: "Проиндексировать пенсии",
		spend: .2,
		text: (s) => `Инфляция ${fmt1(s.inflation)}%, пенсия за ценами не поспевает. Союз пенсионеров требует внеочередной индексации.`
	},
	workers: {
		title: "Профсоюзы требуют заказов и индексации зарплат",
		concede: "Госзаказ заводам и индексация",
		spend: .15,
		text: (s) => `Безработица ${fmt1(s.unemployment)}%. Федерация профсоюзов требует госзаказов и индексации зарплат на госпредприятиях.`,
		extra: (d) => [makeImpulse("inflationSupply", .1, "Индексация зарплат по требованию профсоюзов", "slow", d, "other")]
	},
	business: {
		title: "Бизнес требует снизить налоговую нагрузку",
		concede: "Налоговые каникулы для бизнеса",
		spend: 0,
		text: (s) => `Премия за риск ${fmt1(s.riskPremium)} п.п., ставка ${fmt1(s.keyRate)}%. Союз промышленников требует налоговых каникул — иначе инвестиции уйдут за границу.`,
		extra: (d, s) => [sustainedImpulse("revenue", -(s.nominalGdp || 0) * .4 / 100, 6, "Налоговые каникулы для бизнеса"), makeImpulse("businessConfidence", 4, "Налоговые каникулы", "default", d, "other")]
	},
	siloviki: {
		title: "Генштаб требует денег на перевооружение",
		concede: "Выделить деньги на перевооружение",
		spend: .25,
		text: () => "Генштаб докладывает: техника изношена, довольствие отстаёт от цен. Требование — внеочередное финансирование перевооружения."
	},
	public: {
		title: "Учителя и врачи требуют повышения зарплат",
		concede: "Поднять зарплаты бюджетникам",
		spend: .2,
		text: () => "Профсоюз учителей и врачей грозит забастовкой: зарплаты в школах и больницах отстали от цен и от частного сектора."
	},
	youth: {
		title: "Студенты требуют работы и свобод",
		concede: "Молодёжная программа: рабочие места и гранты",
		spend: .08,
		text: (s) => `Молодёжная безработица растёт вдвое быстрее общей (${fmt1(s.unemployment)}%). Студенческое движение требует программы рабочих мест${s.politicalRegime === "authoritarian" || s.politicalRegime === "totalitarian" ? " и отмены цензуры" : ""}.`
	},
	regions: {
		title: "Губернаторы требуют трансфертов",
		concede: "Увеличить трансферты областям",
		spend: .15,
		text: () => "Ассоциация губернаторов: областные бюджеты пусты, зарплаты бюджетникам на местах платить нечем. Требование — трансферты из центра."
	}
};
function publicGroupDemand(groupId, s, q) {
	const g = SOCIAL_GROUPS.find((x) => x.id === groupId);
	const t = GROUP_DEMANDS[groupId];
	return {
		group: groupId,
		title: t.title,
		text: t.text(s),
		q,
		leader: g.leader,
		defaultOption: "refuse",
		options: [
			{
				id: "concede",
				tone: "generous",
				label: t.concede,
				spend: t.spend,
				support: 10,
				effect: "Группа довольна надолго — но это стоит денег."
			},
			{
				id: "promise",
				tone: "cheap",
				label: "Пообещать и отложить",
				spend: 0,
				support: 5,
				effect: "Сейчас — благодарность, через год — разочарование, если обещание так и не выполнят."
			},
			{
				id: "refuse",
				tone: "hard",
				label: "Отказать",
				spend: 0,
				support: -7,
				effect: "Бюджет цел, группа запомнит отказ — и её лидер перейдёт к делу."
			}
		]
	};
}
function groupDemandStep(s, decisions, difficulty, q, noEvents = false) {
	const out = {
		impulses: [],
		news: [],
		spendPct: 0,
		memory: [],
		demand: null,
		cooldown: Math.max(0, (s.groupDemandCooldown || 0) - 1),
		resolution: null
	};
	const pend = s.groupDemand;
	if (pend) {
		const t = GROUP_DEMANDS[pend.group];
		const chosen = pend.options.find((o) => o.id === decisions.groupResponse);
		const opt = chosen || pend.options.find((o) => o.id === pend.defaultOption);
		const g = SOCIAL_GROUPS.find((x) => x.id === pend.group);
		out.spendPct += opt.spend || 0;
		if (opt.id === "concede") {
			out.memory.push(...groupMemoryOf({ [pend.group]: 10 }, pend.title, 10));
			if (t.extra) out.impulses.push(...t.extra(difficulty, s));
		} else if (opt.id === "promise") {
			out.memory.push(...groupMemoryOf({ [pend.group]: 5 }, `Обещание: ${t.concede.toLowerCase()}`, 4));
			out.memory.push(...groupMemoryOf({ [pend.group]: -8 }, `Обещание не выполнено: ${t.concede.toLowerCase()}`, 8).map((m) => ({
				...m,
				wait: 4
			})));
		} else {
			out.memory.push(...groupMemoryOf({ [pend.group]: -7 }, `Отказ: ${pend.title.toLowerCase()}`, 8));
			out.impulses.push(makeImpulse("tensionPush", 1, `${g.name}: требование отклонено`, "fast", difficulty, "other"));
		}
		out.resolution = {
			group: pend.group,
			title: pend.title,
			option: opt.id,
			label: opt.label,
			byDefault: !chosen,
			q
		};
		out.news.push([
			"gov",
			`${g.name.toUpperCase()}: ${chosen ? opt.label.toUpperCase() : "ОТВЕТА НЕ ДАЛИ"}`,
			`${pend.title}. ${chosen ? `Ответ власти: «${opt.label}».` : "Ответа так и не последовало — это читается как отказ."} ${opt.effect}`,
			7
		]);
		out.cooldown = Math.max(out.cooldown, 3);
		return out;
	}
	if (noEvents || out.cooldown > 0 || q < 4) return out;
	const sup = s.groupSupport || {};
	const worst = SOCIAL_GROUPS.filter((g) => Number.isFinite(sup[g.id]) && sup[g.id] < 42).sort((a, b) => sup[a.id] - sup[b.id])[0];
	if (!worst || rng() >= .45) return out;
	out.demand = publicGroupDemand(worst.id, s, q);
	out.news.push([
		"crisis",
		out.demand.title.toUpperCase(),
		`${worst.leader.name}, ${worst.leader.title}: ${out.demand.text} Ответ нужен в следующем квартале.`,
		8
	]);
	return out;
}
function regionVoteShares(economy, nationalShare, rigged) {
	if (rigged) {
		const official = economy.politicalRegime === "totalitarian" ? 91 : 78;
		return votingRegions(economy).map((r, i) => ({
			id: r.id,
			share: clamp(official + (i % 3 - 1) * 1.4, 0, 100)
		}));
	}
	const regions = votingRegions(economy);
	const stresses = regions.map((r) => regionStress(r, economy));
	const avgStress = stresses.reduce((a, b) => a + b, 0) / (stresses.length || 1);
	const national = economy.groupSupport ? SOCIAL_GROUPS.reduce((a, g) => a + g.weight * (economy.groupSupport[g.id] ?? 50), 0) : 0;
	const raw = regions.map((r, i) => (r.lean || 0) + (avgStress - stresses[i]) * .35 + (r.annex ? (annexLoyalty(economy, r.id) - 60) * .15 : 0) + (economy.groupSupport ? (regionGroupSupport(r.id, economy) - national) * .5 : 0));
	const mean = raw.reduce((a, b) => a + b, 0) / (raw.length || 1);
	return regions.map((r, i) => ({
		id: r.id,
		share: clamp(nationalShare + (raw[i] - mean), 0, 100)
	}));
}
function propagandaEditorial(e) {
	const regime = e.politicalRegime;
	const war = (e.warQuartersLeft || 0) > 0;
	if (regime !== "authoritarian" && regime !== "totalitarian") {
		if (!war || !e.warByChoice) return null;
		return {
			headline: "ВОЙНА И ЭКОНОМИКА: СЧЁТ, КОТОРЫЙ ПРИДЁТ ПОЗЖЕ",
			text: `Рейтинг власти ${Math.round(e.approval)} из 100: сплочение вокруг флага работает первые кварталы и не работает дальше. Санкции уже видны в торговле и инвестициях, премия за риск ${fmt1(e.riskPremium)} п.п., капитал уходит. Редакция напоминает: потенциал экономики, из которого забрали людей и мощности, не возвращается вместе с прекращением огня.`
		};
	}
	const totalitarian = regime === "totalitarian";
	const growthLine = e.gdpGrowth >= 0 ? `Рост экономики составил ${fmt1(e.gdpGrowth)}% — государство подтверждает верность выбранного курса.` : `Плановая перестройка экономики (формально ${fmt1(e.gdpGrowth)}%) — необходимый и временный этап на пути к устойчивому подъёму.`;
	const jobsLine = e.unemployment <= e.nairu + 1 ? "Занятость держится на исторически комфортном уровне." : "Трудовые резервы проходят оптимизацию в интересах государства — временные неудобства окупятся сторицей.";
	const pricesLine = e.inflation <= e.inflationTarget + 2 ? "Цены — под полным контролем компетентных ведомств." : "Отдельные колебания цен носят исключительно технический характер и не должны беспокоить граждан: обеспечение всем необходимым остаётся приоритетом номер один.";
	const debtLine = totalitarian ? e.debtToGdp > 80 ? " Финансовая система работает с полной отдачей, мобилизуя все доступные резервы." : "" : "";
	const warLine = war && e.warByChoice ? totalitarian ? " Операция развивается по плану, и каждый её этап приближает неизбежную победу. Сомневающийся в успехе действует на руку противнику." : " Особые меры, введённые в связи с операцией, носят временный характер и будут сняты по мере достижения поставленных целей." : war ? totalitarian ? " Все трудности — достойная цена, которую нация с гордостью платит за неизбежную победу над врагом. Тот, кто сомневается в успехе, действует на руку противнику." : " Особые меры военного времени объясняют часть текущих трудностей и постепенно снимаются по мере стабилизации обстановки." : "";
	return {
		headline: totalitarian ? war ? "ЕДИНСТВО ПЕРЕД ЛИЦОМ ВРАГА: ЭКОНОМИКА РАБОТАЕТ НА ПОБЕДУ" : "СТРАНА УВЕРЕННО ИДЁТ ВПЕРЁД" : "ВЛАСТЬ ДЕРЖИТ КУРС: СТАБИЛЬНОСТЬ ПРЕВЫШЕ ВСЕГО",
		text: `${growthLine} ${jobsLine} ${pricesLine}${debtLine}${warLine}${totalitarian ? " Инакомыслие в такой момент — не мнение, а угроза единству нации; редакция напоминает читателям о бдительности." : " Правительство призывает сохранять спокойствие и доверие к принимаемым мерам."}`
	};
}
function buildReport({ prev, next, reasons }) {
	const p = [];
	p.push(`ВВП ${next.gdpGrowth >= 0 ? "вырос" : "сократился"} на ${fmt1(Math.abs(next.gdpGrowth))}% в годовом выражении при потенциальном росте ${fmt1(next.potentialGrowth)}%; разрыв выпуска ${fmtSigned1(next.outputGap)}%.`);
	p.push(`Инфляция ${next.inflation >= prev.inflation ? "ускорилась" : "замедлилась"} до ${fmt1(next.inflation)}% при ожиданиях ${fmt1(next.inflationExpectations)}%, безработица ${fmt1(next.unemployment)}% против естественного уровня ${fmt1(next.nairu)}%.`);
	p.push(`Бюджет: ${next.budgetBalancePctGdp >= 0 ? "профицит" : "дефицит"} ${fmt1(Math.abs(next.budgetBalancePctGdp))}% ВВП, долг ${fmt1(next.debtToGdp)}% ВВП, обслуживание забирает ${fmt1(next.interestToRevenue)}% доходов.`);
	p.push(`Ставка по кредитам ${fmt1(next.lendingRate)}% при нейтральной реальной ${fmt1(next.rStar)}%: денежные условия ${next.rateGap > .3 ? "жёстче нейтральных" : next.rateGap < -.3 ? "мягче нейтральных" : "близки к нейтральным"}, кредит ${fmtSigned1(next.creditGrowth)}%.`);
	if (next.creditCrunch) p.push("Капитал банков ограничивает выдачу кредитов — спрос на заёмные средства не удовлетворён.");
	if (Math.abs(next.inflationExpectations - prev.inflationExpectations) > .25) p.push(`Инфляционные ожидания ${next.inflationExpectations > prev.inflationExpectations ? "сдвинулись вверх" : "опустились"} — доверие к ЦБ ${fmt1(next.cbCredibility)}. Чем ниже доверие, тем дороже обойдётся возврат инфляции к цели.`);
	const top = reasons.gdpGrowth[0];
	if (top) p.push(`Главный фактор динамики выпуска: ${top.reasonText.charAt(0).toLowerCase()}${top.reasonText.slice(1)}.`);
	if (next.regime !== "normal" && REGIME_INFO[next.regime]) p.push(`Режим экономики — ${regimeInfoLabel(REGIME_INFO[next.regime], next).toLowerCase()}. ${regimeInfoText(REGIME_INFO[next.regime], next)}`);
	return p.join(" ");
}
// src/lib/content/news.js
const ru = (v) => String(v).replace(".", ",");
const rf1 = (v) => ru(fmt1(v));
const rf2 = (v) => ru(fmt2(v));
const rfs = (v) => ru(fmtSigned1(v));
const rfs2 = (v) => ru(Number.isFinite(v) ? (v >= 0 ? "+" : "") + ruNum(v, 2) : "—");
let __newsId = 1;
function bumpNewsId(min) {
	__newsId = Math.max(__newsId, min);
}
function mkNews(cat, headline, text, opts) {
	const o = opts || {};
	return {
		id: `n${__newsId++}`,
		cat,
		headline,
		text,
		priority: o.priority || 4,
		chain: o.chain || null,
		storyId: o.storyId || null,
		storyTitle: o.storyTitle || null,
		step: o.step || null,
		steps: o.steps || null,
		tag: o.tag || null
	};
}
const STORY_TEMPLATES = {
	commodity_down: {
		id: "commodity_down",
		title: "Падение сырьевых цен",
		steps: [
			{ make: (s) => mkNews("world", `МИРОВЫЕ ЦЕНЫ НА СЫРЬЁ ПАДАЮТ: ИНДЕКС ${rf1(s.commodityIndex)}`, "Сырьевые рынки развернулись вниз. Для экспортёров это прямой удар по выручке, для бюджета — по доходам, а дальше цепочка дойдёт до курса и цен в магазинах.", {
				priority: 7,
				chain: [
					"Сырьё ↓",
					"Экспортная выручка ↓",
					"Доходы бюджета ↓",
					"Курс ↓",
					"Импортные цены ↑",
					"Реальные доходы ↓"
				]
			}) },
			{
				gap: 1,
				make: (s) => mkNews("markets", `ЭКСПОРТ СОКРАЩАЕТСЯ ДО ${fmtMoney(s.exports)}`, `Экспортная выручка падает вслед за ценами. Текущий счёт ${fmtMoneySigned(s.currentAccount)} — приток валюты в страну слабеет, и это уже вопрос курса.`, { priority: 6 })
			},
			{
				gap: 1,
				make: (s) => s.budgetBalancePctGdp < 0 ? mkNews("gov", `БЮДЖЕТ НЕДОСЧИТЫВАЕТСЯ ДОХОДОВ: ДЕФИЦИТ ${rf1(Math.abs(s.budgetBalancePctGdp))}% ВВП`, `Сужение налоговой базы экспортёров бьёт по доходам казны при долге ${rf1(s.debtToGdp)}% ВВП — Минфину предстоит выбирать между сокращением расходов и займами.`, { priority: 6 }) : mkNews("gov", `БЮДЖЕТ ВЫДЕРЖАЛ СЫРЬЕВОЙ УДАР: ПРОФИЦИТ ${rf1(s.budgetBalancePctGdp)}% ВВП`, `Доходы от экспортёров просели, но запас прочности бюджета оказался достаточным. Долг ${rf1(s.debtToGdp)}% ВВП, резервный фонд ${fmtMoney(s.sovereignFund || 0)}.`, { priority: 5 })
			},
			{
				gap: 1,
				make: (s) => s.fxDeprAnnual > .5 ? mkNews("markets", `ВАЛЮТА СЛАБЕЕТ: ${rfs(s.fxDeprAnnual)}% В ГОДОВОМ ВЫРАЖЕНИИ`, "Платёжный баланс ухудшился — валюта пошла вниз. Следующий шаг цепочки предсказуем: дорожает импорт.", { priority: 6 }) : mkNews("markets", "КУРС УСТОЯЛ ВОПРЕКИ УХУДШЕНИЮ БАЛАНСА", "Отток валюты по торговому счёту компенсирован притоком капитала или интервенциями. Импортная инфляция в этот раз не придёт — но резервы и доверие инвесторов не бесконечны.", { priority: 5 })
			},
			{
				gap: 1,
				make: (s) => mkNews("households", `ИМПОРТ ДОРОЖАЕТ, РЕАЛЬНЫЕ ЗАРПЛАТЫ ${s.wageGrowth - s.inflation >= 0 ? "ЕДВА РАСТУТ" : "ПАДАЮТ"}`, `Цены импорта растут на ${rf1(s.importPriceInflation)}% в год при инфляции ${rf1(s.inflation)}%. Зарплаты прибавляют ${rf1(s.wageGrowth)}% — реальный доход ${rfs(s.wageGrowth - s.inflation)}%. Замыкающее звено цепочки — уровень жизни.`, { priority: 6 })
			}
		]
	},
	oil_up: {
		id: "oil_up",
		title: "Сырьевой рост",
		steps: [
			{ make: (s) => mkNews("world", `СЫРЬЁ ДОРОЖАЕТ: ИНДЕКС ${rf1(s.commodityIndex)}`, "Мировые цены на сырьё пошли вверх. Для экспортёра это валютная выручка, для импортёра — удар по издержкам.", {
				priority: 6,
				chain: [
					"Сырьё ↑",
					"Торговый баланс",
					"Курс",
					"Издержки и цены",
					"Решение ЦБ"
				]
			}) },
			{
				gap: 1,
				make: (s) => s.tradeBalance >= 0 ? mkNews("markets", `ПРИТОК ВАЛЮТЫ УКРЕПЛЯЕТ ПОЗИЦИИ: ТОРГОВЫЙ БАЛАНС ${fmtMoneySigned(s.tradeBalance)}`, "Экспортная выручка растёт быстрее импорта. Крепкий курс сдержит инфляцию, но ударит по конкурентоспособности несырьевых отраслей.", { priority: 5 }) : mkNews("business", `ИЗДЕРЖКИ ПРОИЗВОДСТВА РАСТУТ ВСЛЕД ЗА СЫРЬЁМ`, `Экономика покупает сырьё дороже, чем продаёт. Инфляция ${rf1(s.inflation)}% — и это инфляция издержек, которую ставкой лечить больнее всего.`, { priority: 6 })
			},
			{
				gap: 2,
				make: (s) => mkNews("cb", `ЦБ ОЦЕНИВАЕТ ПЕРЕНОС СЫРЬЕВЫХ ЦЕН: ОЖИДАНИЯ ${rf1(s.inflationExpectations)}%`, `Ключевой вопрос — закрепится ли ценовой шок в ожиданиях. Пока доверие к ЦБ ${Math.round(s.cbCredibility)} из 100, и от него зависит, придётся ли жертвовать выпуском.`, { priority: 5 })
			}
		]
	},
	global_rate_hike: {
		id: "global_rate_hike",
		title: "Ужесточение в мире",
		steps: [
			{ make: (s) => mkNews("world", `МИРОВЫЕ СТАВКИ РАСТУТ ДО ${rf1(s.worldRate)}%`, "Крупнейшие центробанки ужесточают политику. Капитал разворачивается в сторону безопасных активов — развивающиеся рынки первыми чувствуют отток.", {
				priority: 7,
				chain: [
					"Мировые ставки ↑",
					"Отток капитала",
					"Курс ↓",
					"Импортные цены ↑",
					"Ставка ЦБ ↑",
					"Кредит ↓"
				]
			}) },
			{
				gap: 1,
				make: (s) => mkNews("markets", `ОТТОК КАПИТАЛА: ${fmtMoneySigned(s.netCapitalFlow)} В ГОДОВОМ ВЫРАЖЕНИИ`, `Разница реальных ставок с миром ${rfs(s.carry)} п.п. при премии за риск ${rf1(s.riskPremium)} п.п. Инвесторы уходят — резервы ${fmtMoney(s.reserves)}.`, { priority: 6 })
			},
			{
				gap: 1,
				make: (s) => mkNews("cb", `ДАВЛЕНИЕ НА КУРС СТАВИТ ЦБ ПЕРЕД ВЫБОРОМ`, `Валюта ${s.fxDeprAnnual > 0 ? `слабеет на ${rf1(s.fxDeprAnnual)}% годовых` : "держится"}, инфляция ${rf1(s.inflation)}%. Поднять ставку — задушить кредит; не поднимать — импортировать инфляцию.`, { priority: 6 })
			}
		]
	},
	bank_run: {
		id: "bank_run",
		title: "Банковская паника",
		steps: [
			{ make: (s) => mkNews("crisis", "ВКЛАДЧИКИ ЗАБИРАЮТ ДЕНЬГИ ИЗ БАНКОВ", `Ликвидность банковской системы упала до ${Math.round(s.bankLiquidity)} из 100. Банки сокращают выдачу новых кредитов, чтобы удержать наличность.`, {
				priority: 9,
				chain: [
					"Отток депозитов",
					"Ликвидность ↓",
					"Кредит ↓",
					"Инвестиции ↓",
					"ВВП ↓",
					"Просрочка ↑"
				]
			}) },
			{
				gap: 1,
				make: (s) => mkNews("business", `КРЕДИТ ДЛЯ БИЗНЕСА ПЕРЕСЫХАЕТ: РОСТ ПОРТФЕЛЯ ${rfs(s.creditGrowth)}%`, `Ставка по кредитам ${rf1(s.lendingRate)}%, достаточность капитала банков ${rf1(s.bankCapitalAdequacy)}%. Компании откладывают инвестиционные проекты.`, { priority: 7 })
			},
			{
				gap: 1,
				make: (s) => mkNews("households", `РЫНОК ТРУДА ЧУВСТВУЕТ КРЕДИТНОЕ СЖАТИЕ: БЕЗРАБОТИЦА ${rf1(s.unemployment)}%`, `Сокращение инвестиций дошло до занятости. Разрыв выпуска ${rfs(s.outputGap)}% — и чем дольше он отрицательный, тем выше естественный уровень безработицы в будущем.`, { priority: 7 })
			},
			{
				gap: 2,
				make: (s) => mkNews("markets", `ПРОСРОЧКА РАСТЁТ ДО ${rf1(s.bankNPL)}%: ПЕТЛЯ ЗАМКНУЛАСЬ`, "Слабая экономика возвращается в банки неплатежами, неплатежи съедают капитал, капитал ограничивает кредит. Разорвать круг можно только извне — рекапитализацией или смягчением политики.", { priority: 8 })
			}
		]
	},
	sanctions: {
		id: "sanctions",
		title: "Внешние ограничения",
		steps: [
			{ make: (_s) => mkNews("world", "ВВЕДЕНЫ ВНЕШНИЕ ОГРАНИЧЕНИЯ НА ТОРГОВЛЮ И ФИНАНСЫ", "Часть торговых и финансовых каналов закрыта. Экономика теряет не только спрос, но и производственные возможности: это шок предложения.", {
				priority: 9,
				chain: [
					"Ограничения",
					"Экспорт и импорт ↓",
					"Отток капитала",
					"Курс ↓",
					"Инфляция ↑",
					"Потенциал ↓"
				]
			}) },
			{
				gap: 1,
				make: (s) => mkNews("markets", `КУРС ПОД ДАВЛЕНИЕМ, ПРЕМИЯ ЗА РИСК ${rf1(s.riskPremium)} П.П.`, `Инвесторы требуют больше за страновой риск, новый госдолг обходится в ${rf1(s.effectiveDebtRate)}%. Резервы ${fmtMoney(s.reserves)} — вопрос, тратить ли их на защиту курса.`, { priority: 7 })
			},
			{
				gap: 2,
				make: (s) => mkNews("business", `ПОТЕНЦИАЛЬНЫЙ ВЫПУСК СНИЖАЕТСЯ: РОСТ ПОТЕНЦИАЛА ${rf1(s.potentialGrowth)}%`, "Разорванные цепочки поставок — это не временная просадка спроса, а утраченные мощности. Стимулировать такую экономику деньгами значит получить инфляцию без выпуска.", { priority: 7 })
			}
		]
	},
	pandemic: {
		id: "pandemic",
		title: "Пандемия",
		steps: [
			{ make: (_s) => mkNews("crisis", "ВСПЫШКА ЗАБОЛЕВАНИЯ: ОГРАНИЧЕНИЯ ЭКОНОМИЧЕСКОЙ АКТИВНОСТИ", "Одновременно падают и спрос, и предложение. Редкий случай, когда бюджетная поддержка нужна быстрее денежной.", {
				priority: 9,
				chain: [
					"Ограничения",
					"Спрос ↓ и мощности ↓",
					"Безработица ↑",
					"Расходы бюджета ↑",
					"Долг ↑"
				]
			}) },
			{
				gap: 1,
				make: (s) => mkNews("households", `БЕЗРАБОТИЦА ${rf1(s.unemployment)}%, ДОВЕРИЕ НАСЕЛЕНИЯ ${Math.round(s.consumerConfidence)}`, "Домохозяйства сокращают расходы и наращивают сбережения. Трансферты сейчас работают сильнее обычного: склонность тратить у людей без дохода максимальна.", { priority: 7 })
			},
			{
				gap: 2,
				make: (s) => mkNews("gov", `СЧЁТ ЗА КРИЗИС: ДОЛГ ${rf1(s.debtToGdp)}% ВВП`, `Поддержка экономики оплачена займами. Обслуживание долга забирает ${rf1(s.interestToRevenue)}% доходов бюджета — это уже структурное ограничение на будущую политику.`, { priority: 6 })
			}
		]
	},
	war: {
		id: "war",
		title: "Война",
		steps: [
			{ make: (s) => mkNews("crisis", "НАЧАЛАСЬ ВОЙНА: ЭКОНОМИКА ПЕРЕХОДИТ НА ВОЕННЫЕ РЕЛЬСЫ", `Торговля и инвестиции сжимаются, инвесторы уходят в защитные активы. ${s.warType === "offensive" ? "Война носит наступательный характер: партнёры вводят санкции, торговые и финансовые каналы сворачиваются быстрее, чем от одного военного шока." : s.warType === "defensive" ? "Война носит оборонительный характер: союзники открывают кредитные линии и наращивают закупки — часть удара компенсирует иностранная помощь." : "Насколько тяжёлым будет удар — во многом решили расходы на оборону, сделанные ещё до войны."}`, {
				priority: 10,
				chain: [
					"Война",
					"Торговля ↓ и инвестиции ↓",
					"Доверие ↓",
					"Издержки ↑",
					"Отток капитала"
				]
			}) },
			{
				gap: 1,
				make: (s) => mkNews("world", `ОБОРОННЫЕ РАСХОДЫ — ${rf1(s.budgetShares.defense)}% БЮДЖЕТА`, s.budgetShares.defense >= 20 ? "Заранее укреплённая оборона и логистика смягчили удар по экономике — тыл оказался готов." : "Война застала экономику с низкими расходами на оборону: адаптация обходится дороже и медленнее.", { priority: 7 })
			},
			{
				gap: 2,
				make: (s) => mkNews("gov", `ЦЕНА ВОЙНЫ: ДОЛГ ${rf1(s.debtToGdp)}% ВВП`, `Военные расходы и потери выпуска ложатся на бюджет. ${s.warType === "offensive" ? "Санкции отрезали часть внешнего финансирования — дефицит приходится закрывать более дорогим внутренним долгом." : s.warType === "defensive" ? "Иностранная помощь и льготные кредиты союзников частично разгружают бюджет, но обслуживание долга и оборона всё равно конкурируют за каждый процент." : "Обслуживание долга и оборона теперь конкурируют за каждый бюджетный процент."}`, { priority: 6 })
			}
		]
	},
	tech_breakthrough: {
		id: "tech_breakthrough",
		title: "Технологический скачок",
		steps: [{ make: (s) => mkNews("business", `ТЕХНОЛОГИЧЕСКИЙ ПРОРЫВ: ПРОИЗВОДИТЕЛЬНОСТЬ ${rf1(s.productivity)}`, "Новые технологии повышают совокупную факторную производительность. Это редкий шок, который одновременно увеличивает выпуск и снижает инфляцию.", {
			priority: 6,
			chain: [
				"Производительность ↑",
				"Потенциал ↑",
				"Издержки ↓",
				"Реальные зарплаты ↑"
			]
		}) }, {
			gap: 2,
			make: (s) => mkNews("households", `РЕАЛЬНЫЕ ЗАРПЛАТЫ РАСТУТ НА ${rfs(s.wageGrowth - s.inflation)}%`, `Рост производительности позволяет платить больше без инфляции: удельные издержки труда ${rf1(s.unitLaborCostGrowth)}%. Потенциальный рост ВВП ${rf1(s.potentialGrowth)}%.`, { priority: 5 })
		}]
	},
	supply_chain: {
		id: "supply_chain",
		title: "Шок предложения",
		steps: [
			{ make: (_s) => mkNews("world", "НАРУШЕНЫ ЦЕПОЧКИ ПОСТАВОК", "Логистика встала: часть производственных мощностей физически не может работать. Это не падение спроса — это падение того, сколько экономика вообще способна произвести.", { priority: 8 }) },
			{ make: (s) => mkNews("business", "СБОИ ПОСТАВОК: ИЗДЕРЖКИ РАСТУТ, ПОТЕНЦИАЛ СНИЖАЕТСЯ", `Производство встало без комплектующих: выпуск падает, разрыв ${rfs(s.outputGap)}%, рост потенциала снизился до ${rf1(s.potentialGrowth)}%. Падает и то, что экономика производит, и то, что она в принципе способна произвести — но цены при этом растут.`, {
				priority: 8,
				chain: [
					"Сбои поставок",
					"Выпуск ↓",
					"Потенциал ↓",
					"Издержки ↑",
					"Инфляция ↑",
					"Дилемма ЦБ"
				]
			}) },
			{
				gap: 1,
				make: (s) => s.outputGap < 0 && s.inflation > s.inflationTarget ? mkNews("cb", `ДИЛЕММА ЦБ: ИНФЛЯЦИЯ ${rf1(s.inflation)}% ПРИ РАЗРЫВЕ ВЫПУСКА ${rfs(s.outputGap)}%`, `Ожидания ${rf1(s.inflationExpectations)}%. Подавлять инфляцию — углублять спад. Терпеть — рисковать срывом ожиданий, после которого возврат к цели обойдётся дороже.`, { priority: 8 }) : s.outputGap >= 0 ? mkNews("cb", `ШОК ПРОШЁЛ, НО РАЗРЫВ ВЫПУСКА УЖЕ ${rfs(s.outputGap)}%`, `Пока экономика подстраивалась под сбой поставок, спрос успел обогнать восстановившееся предложение: инфляция ${rf1(s.inflation)}% при ожиданиях ${rf1(s.inflationExpectations)}%. Дилемма сменилась на обратную — сдерживать перегрев, а не спасать от спада.`, { priority: 7 }) : mkNews("cb", `ШОК ПОСТАВОК ПОЗАДИ: ИНФЛЯЦИЯ ${rf1(s.inflation)}% ПРИ РАЗРЫВЕ ВЫПУСКА ${rfs(s.outputGap)}%`, `Издержки перестали расти быстрее спроса — цены отпустило раньше, чем закрылся разрыв выпуска. Дилеммы уже нет: пространство поддержать спрос есть, инфляция не мешает.`, { priority: 6 })
			}
		]
	},
	demographic: {
		id: "demographic",
		title: "Демографический сдвиг",
		steps: [{ make: (_s) => mkNews("households", "СТАРЕНИЕ НАСЕЛЕНИЯ СЖИМАЕТ РАБОЧУЮ СИЛУ", "Предложение труда сокращается. В краткосрочной перспективе это разгон зарплат, в долгосрочной — более низкий потенциальный рост и более низкая нейтральная ставка.", {
			priority: 6,
			chain: [
				"Рабочая сила ↓",
				"Зарплаты ↑",
				"Потенциал ↓",
				"Нагрузка на бюджет ↑"
			]
		}) }, {
			gap: 2,
			make: (s) => mkNews("gov", `СОЦИАЛЬНЫЕ ОБЯЗАТЕЛЬСТВА ДАВЯТ НА БЮДЖЕТ: БАЛАНС ${rfs(s.budgetBalancePctGdp)}% ВВП`, `Меньше работников — меньше налоговая база, больше получателей выплат. Нейтральная ставка r* опустилась до ${rf1(s.rStar)}%: это меняет всю шкалу того, что считать жёсткой политикой.`, { priority: 6 })
		}]
	},
	consumer_boom: {
		id: "consumer_boom",
		title: "Потребительский бум",
		steps: [{ make: (_s) => mkNews("households", "ДОМОХОЗЯЙСТВА НАРАЩИВАЮТ РАСХОДЫ И СПРОС НА КРЕДИТ", "Потребительский оптимизм разгоняет спрос. Пока есть свободные мощности, это рост; когда они закончатся — инфляция.", {
			priority: 6,
			chain: [
				"Спрос ↑",
				"Разрыв выпуска ↑",
				"Инфляция ↑",
				"Реакция ЦБ"
			]
		}) }, {
			gap: 2,
			make: (s) => s.outputGap > 1.5 ? mkNews("markets", `ЭКОНОМИКА ПЕРЕГРЕВАЕТСЯ: РАЗРЫВ ВЫПУСКА ${rfs(s.outputGap)}%`, `Инфляция ${rf1(s.inflation)}% при безработице ${rf1(s.unemployment)}% — ниже естественного уровня. Дефицит работников толкает зарплаты вверх на ${rf1(s.wageGrowth)}%.`, { priority: 7 }) : mkNews("business", "СПРОС АБСОРБИРОВАН БЕЗ ПЕРЕГРЕВА", `Экономика переварила всплеск спроса: разрыв выпуска ${rfs(s.outputGap)}%, инфляция ${rf1(s.inflation)}%. Свободные мощности сделали своё дело.`, { priority: 4 })
		}]
	},
	rate_hike: {
		id: "rate_hike",
		title: "Ужесточение денежной политики",
		steps: [
			{
				gap: 2,
				make: (s) => mkNews("markets", `БАНКИ ПЕРЕНОСЯТ СТАВКУ В КРЕДИТЫ: ${rf1(s.lendingRate)}%`, `Перенос ключевой ставки в рыночные идёт с лагом. Рост кредитного портфеля ${rfs(s.creditGrowth)}%, спрос на заёмные деньги остывает.`, { priority: 6 })
			},
			{
				gap: 1,
				make: (s) => mkNews("business", `ИНВЕСТИЦИИ ЗАМЕДЛЯЮТСЯ: ${rfs(s.investmentGrowth)}%`, `Дорогие деньги переписывают инвестиционные планы. Доверие бизнеса ${Math.round(s.businessConfidence)}, разрыв выпуска ${rfs(s.outputGap)}%.`, { priority: 6 })
			},
			{
				gap: 2,
				make: (s) => mkNews("households", `ЦЕНА ДЕЗИНФЛЯЦИИ: БЕЗРАБОТИЦА ${rf1(s.unemployment)}%, ИНФЛЯЦИЯ ${rf1(s.inflation)}%`, `Замедление цен оплачено занятостью — это и есть коэффициент жертв. Ожидания ${rf1(s.inflationExpectations)}%: чем выше доверие к ЦБ, тем дешевле обходится такой манёвр.`, { priority: 7 })
			}
		]
	},
	rate_cut: {
		id: "rate_cut",
		title: "Смягчение денежной политики",
		steps: [{
			gap: 2,
			make: (s) => mkNews("business", `КРЕДИТ ОЖИВАЕТ: ПОРТФЕЛЬ ${rfs(s.creditGrowth)}%`, `Инвестиции ${rfs(s.investmentGrowth)}%, доверие бизнеса ${Math.round(s.businessConfidence)}. Кредитный разрыв ${rfs(s.creditGap)} п.п. ВВП — за этим показателем стоит следить: сегодняшний бум завтра вернётся просрочкой.`, { priority: 6 })
		}, {
			gap: 2,
			make: (s) => mkNews("cb", `ПРОВЕРКА ОЖИДАНИЙ: ${rf1(s.inflationExpectations)}% ПРИ ЦЕЛИ 4%`, `Инфляция ${rf1(s.inflation)}%, доверие к ЦБ ${Math.round(s.cbCredibility)}. Если ожидания сдвинулись вверх, возврат к цели обойдётся дороже, чем стоило смягчение.`, { priority: 6 })
		}]
	},
	vat_hike: {
		id: "vat_hike",
		title: "Повышение НДС",
		steps: [
			{ make: (s) => mkNews("gov", `НДС ПОВЫШЕН ДО ${rf1(s.vatRate)}%`, `Минфин закрывает дефицит ${rf1(Math.abs(s.budgetBalancePctGdp))}% ВВП за счёт косвенного налога. Цены отреагируют почти сразу — это разовый скачок, но ожидания могут его подхватить.`, {
				priority: 7,
				chain: [
					"НДС ↑",
					"Цены ↑ сразу",
					"Реальные доходы ↓",
					"Спрос ↓",
					"База налога ↓"
				]
			}) },
			{
				gap: 1,
				make: (s) => mkNews("households", `ЦЕНЫ В МАГАЗИНАХ РАСТУТ: ИНФЛЯЦИЯ ${rf1(s.inflation)}%`, `Реальные зарплаты ${rfs(s.wageGrowth - s.inflation)}%, доверие населения ${Math.round(s.consumerConfidence)}. Косвенный налог всегда платит покупатель.`, { priority: 6 })
			},
			{
				gap: 2,
				make: (s) => mkNews("gov", `СБОР НАЛОГОВ: ${rf1(s.revenuePctGdp)}% ВВП, ТЕНЕВАЯ ЭКОНОМИКА ${rf1(s.shadowShare)}%`, "База реагирует на ставку медленно, но необратимо: часть оборота уходит в тень и обратно возвращается неохотно.", { priority: 6 })
			}
		]
	},
	social_boost: {
		id: "social_boost",
		title: "Социальный пакет",
		steps: [
			{ make: (s) => mkNews("gov", "ПРАВИТЕЛЬСТВО РАСШИРЯЕТ СОЦИАЛЬНЫЕ ВЫПЛАТЫ", `Выплаты растут при безработице ${rf1(s.unemployment)}% и разрыве выпуска ${rfs(s.outputGap)}%. Мультипликатор трансфертов тем выше, чем больше в экономике свободных мощностей.`, {
				priority: 7,
				chain: [
					"Выплаты ↑",
					"Располагаемый доход ↑",
					"Потребление ↑",
					"Спрос ↑",
					"Дефицит ↑"
				]
			}) },
			{
				gap: 1,
				make: (s) => mkNews("households", `ПОТРЕБЛЕНИЕ РАЗГОНЯЕТСЯ: ${rfs(s.consumptionGrowth)}%`, `Доверие населения ${Math.round(s.consumerConfidence)}, реальные доходы ${rfs(s.wageGrowth - s.inflation)}%. Деньги дошли до спроса — вопрос, дойдут ли до выпуска или до цен.`, { priority: 6 })
			},
			{
				gap: 2,
				make: (s) => mkNews("markets", `СЧЁТ ЗА ЩЕДРОСТЬ: ДЕФИЦИТ ${rf1(Math.abs(s.budgetBalancePctGdp))}% ВВП, ДОЛГ ${rf1(s.debtToGdp)}%`, `Премия за риск ${rf1(s.riskPremium)} п.п., ставка по новому долгу ${rf1(s.effectiveDebtRate)}%. Трансферты почти не повышают потенциал — в отличие от инвестиций.`, { priority: 7 })
			}
		]
	},
	credit_boom: {
		id: "credit_boom",
		title: "Кредитный бум",
		steps: [
			{ make: (s) => mkNews("markets", `КРЕДИТНЫЙ БУМ: РАЗРЫВ ${rfs(s.creditGap)} П.П. ВВП`, `Портфель растёт на ${rfs(s.creditGrowth)}% при номинальном ВВП заметно медленнее. Пока просрочка низкая — ${rf1(s.bankNPL)}%, но именно так начинаются все банковские кризисы.`, {
				priority: 7,
				chain: [
					"Дешёвый кредит",
					"Долговая нагрузка ↑",
					"Просрочка ↑ через 2–3 года",
					"Капитал банков ↓",
					"Кредитное сжатие"
				]
			}) },
			{
				gap: 4,
				make: (s) => mkNews("markets", `НАСЛЕДИЕ БУМА: ПРОСРОЧКА ${rf1(s.bankNPL)}%`, `Выданные в лёгкие времена кредиты выходят на просрочку. Достаточность капитала банков ${rf1(s.bankCapitalAdequacy)}% при требовании ${rf1(s.capitalRequirement)}%.`, { priority: 7 })
			},
			{
				gap: 3,
				make: (s) => s.bankCapitalAdequacy < s.capitalRequirement + 1.5 ? mkNews("crisis", "БАНКИ УПИРАЮТСЯ В НОРМАТИВ КАПИТАЛА", `Капитал ${fmtMoney(s.bankCapital)} больше не позволяет наращивать портфель. Кредитное сжатие ударит по инвестициям, инвестиции — по ВВП, ВВП — снова по просрочке.`, { priority: 9 }) : mkNews("markets", "БАНКОВСКАЯ СИСТЕМА ПЕРЕВАРИЛА БУМ", `Достаточность капитала ${rf1(s.bankCapitalAdequacy)}% — запас прочности выдержал. Кредитный цикл прошёл без срыва.`, { priority: 5 })
			}
		]
	},
	debt_spiral: {
		id: "debt_spiral",
		title: "Долговая спираль",
		steps: [{ make: (s) => mkNews("gov", `ГОСДОЛГ ПРЕВЫСИЛ ${Math.floor(s.debtToGdp / 5) * 5}% ВВП`, `Обслуживание забирает ${rf1(s.interestToRevenue)}% доходов бюджета при ставке ${rf1(s.effectiveDebtRate)}%. Пока номинальный рост экономики выше ставки, долг стабилизируется сам; если нет — начинается спираль.`, {
			priority: 8,
			chain: [
				"Долг ↑",
				"Премия за риск ↑",
				"Ставка по долгу ↑",
				"Процентные расходы ↑",
				"Дефицит ↑"
			]
		}) }, {
			gap: 2,
			make: (s) => mkNews("markets", `ИНВЕСТОРЫ ТРЕБУЮТ ПРЕМИЮ: ${rf1(s.riskPremium)} П.П.`, `Каждый новый выпуск дороже предыдущего: средняя ставка по долгу ${rf1(s.effectiveDebtRate)}% против номинального роста ВВП около ${rf1(s.gdpGrowth + s.inflation)}%. Это арифметика, из которой не выйти обещаниями.`, { priority: 8 })
		}]
	},
	credit_crunch: {
		id: "credit_crunch",
		title: "Кредитное сжатие",
		steps: [{ make: (s) => mkNews("crisis", "КАПИТАЛ БАНКОВ ОГРАНИЧИЛ ВЫДАЧУ КРЕДИТОВ", `Достаточность капитала ${rf1(s.bankCapitalAdequacy)}% при требовании ${rf1(s.capitalRequirement)}%: спрос на кредит есть, предложения нет. Снижение ставки в такой ситуации почти не работает.`, {
			priority: 9,
			chain: [
				"Капитал ↓",
				"Предложение кредита ↓",
				"Инвестиции ↓",
				"ВВП ↓",
				"Просрочка ↑",
				"Капитал ↓"
			]
		}) }, {
			gap: 2,
			make: (s) => mkNews("business", `ЭКОНОМИКА БЕЗ КРЕДИТА: ИНВЕСТИЦИИ ${rfs(s.investmentGrowth)}%`, `Разрыв выпуска ${rfs(s.outputGap)}%, безработица ${rf1(s.unemployment)}%. Разорвать петлю можно рекапитализацией банков или смягчением норматива — у обоих решений есть цена.`, { priority: 8 })
		}]
	},
	bond_issuance: {
		id: "bond_issuance",
		title: "Заём про запас",
		steps: [{ make: (s) => mkNews("markets", `МИНФИН ЗАНИМАЕТ СВЕРХ НЕОБХОДИМОГО: ДОЛГ ${rf1(s.debtToGdp)}% ВВП`, `Размещение прошло не под дефицит этого квартала, а про запас — рынок это видит и закладывает в цену: премия за риск ${rf1(s.riskPremium)} п.п. Резерв в суверенном фонде вырос, но занять заранее — тоже занять.`, {
			priority: 6,
			chain: [
				"Размещение сверх дефицита",
				"Долг ↑ сразу",
				"Премия за риск ↑",
				"Резерв в фонде ↑",
				"Доступен без нового займа позже"
			]
		}) }, {
			gap: 2,
			make: (s) => s.sovereignFund > 1 ? mkNews("gov", `СУВЕРЕННЫЙ ФОНД: ${fmtMoney(s.sovereignFund)} В РЕЗЕРВЕ`, `Отложенное про запас разместилось не в расходы, а в фонд. Обслуживание долга при этом уже обходится в ${rf1(s.interestToRevenue)}% доходов бюджета — резерв не бесплатен, он занят заранее.`, { priority: 5 }) : mkNews("markets", "РЕЗЕРВ УЖЕ РАЗОШЁЛСЯ НА ДЕФИЦИТ", `Фонд, пополненный про запас, снова пуст — дефицит следующих кварталов забрал его раньше, чем он успел пригодиться при более выгодных условиях займа.`, { priority: 5 })
		}]
	},
	cds_spike: {
		id: "cds_spike",
		title: "Ставка против суверена",
		steps: [{ make: (s) => mkNews("markets", `СВОП НА ДЕФОЛТ (CDS) ПОДСКОЧИЛ ДО ${Math.round(s.sovereignSpread)} Б.П.`, `Инструмент, который прежде почти не двигался, за квартал резко переоценил риск: премия за риск ${rf1(s.riskPremium)} п.п. Это не абстрактная цифра из сводки, а ставка, которую можно купить или продать прямо в трейдерском терминале, — и рынок свопов уже сделал свою.`, {
			priority: 8,
			chain: [
				"Скачок спреда",
				"CDS дорожает",
				"Рынок закладывает риск дефолта",
				"Занимать дороже для всех"
			]
		}) }, {
			gap: 2,
			make: (s) => s.sovereignSpread > 250 ? mkNews("markets", `ПРЕМИЯ ЗА ДЕФОЛТ ОСТАЁТСЯ ВЫСОКОЙ: ${Math.round(s.sovereignSpread)} Б.П.`, `Рынок CDS не разворачивается — устойчиво повышенная премия означает, что инвесторы всё ещё считают риск дефолта реальным, а не разовой паникой. Каждый новый выпуск долга занимает по этой цене.`, { priority: 6 }) : mkNews("markets", "ПРЕМИЯ ЗА ДЕФОЛТ ОТКАТИЛАСЬ", `Своп на дефолт подешевел обратно — рынок решил, что скачок был паникой, а не переоценкой фундаментальных рисков. Доверие к платёжеспособности страны восстановилось быстрее, чем сам долг.`, { priority: 5 })
		}]
	}
};
const STORY_CONFLICTS = {
	commodity_down: ["oil_up"],
	oil_up: ["commodity_down"],
	credit_boom: ["credit_crunch"],
	credit_crunch: ["credit_boom"],
	rate_hike: ["rate_cut"],
	rate_cut: ["rate_hike"]
};
const storyConflicts = (id, active) => (STORY_CONFLICTS[id] || []).some((other) => (active || []).some((x) => x.tplId === other));
const storyStartWait = (id) => {
	const tpl = STORY_TEMPLATES[id];
	return tpl && tpl.steps.length ? Math.max(0, (tpl.steps[0].gap || 1) - 1) : 0;
};
function advanceStories(stories, next, quarterIndex) {
	const out = [];
	const keep = [];
	for (const st of stories || []) {
		const tpl = STORY_TEMPLATES[st.tplId];
		if (!tpl) continue;
		if (st.wait > 0) {
			keep.push({
				...st,
				wait: st.wait - 1
			});
			continue;
		}
		const step = tpl.steps[st.nextIdx];
		if (!step) continue;
		const item = step.make(next);
		if (item) out.push({
			...item,
			q: quarterIndex,
			storyId: tpl.id,
			storyTitle: tpl.title,
			step: st.nextIdx + 1,
			steps: tpl.steps.length
		});
		const nextIdx = st.nextIdx + 1;
		if (nextIdx < tpl.steps.length) keep.push({
			tplId: st.tplId,
			nextIdx,
			wait: (tpl.steps[nextIdx].gap || 1) - 1
		});
	}
	return {
		news: out,
		stories: keep
	};
}
function storyTriggers(prev, next, decisions, active, cooldowns) {
	const fire = [];
	const busy = (id) => active.some((x) => x.tplId === id) || (cooldowns[`story:${id}`] || 0) > 0 || storyConflicts(id, active);
	const dRate = decisions.keyRate - prev.keyRate;
	if (dRate >= .75 && !busy("rate_hike")) fire.push("rate_hike");
	if (dRate <= -.75 && !busy("rate_cut")) fire.push("rate_cut");
	if (decisions.vatRate - prev.vatRate >= .5 && !busy("vat_hike")) fire.push("vat_hike");
	if (decisions.transfers >= 3 && prev.transfersGrowth < next.transfersGrowth && !busy("social_boost")) fire.push("social_boost");
	if (next.creditGap > 5.5 && !busy("credit_boom")) fire.push("credit_boom");
	if (next.creditCrunch && !prev.creditCrunch && !busy("credit_crunch")) fire.push("credit_crunch");
	const debtGrowthGap = next.effectiveDebtRate - next.gdpGrowth - next.inflation;
	if (!busy("debt_spiral") && (next.debtToGdp > 80 && Math.floor(next.debtToGdp / 10) > Math.floor(prev.debtToGdp / 10) || next.debtToGdp > 50 && next.debtToGdp > prev.debtToGdp + .1 && debtGrowthGap > 3)) fire.push("debt_spiral");
	if ((decisions.bondIssuance || 0) / Math.max(1, next.nominalGdp) * 100 >= .5 && !busy("bond_issuance")) fire.push("bond_issuance");
	if (!busy("cds_spike") && next.sovereignSpread > 250 && next.sovereignSpread - (prev.sovereignSpread || 0) > 45) fire.push("cds_spike");
	return fire;
}
function generateNews(prev, s, decisions, quarterIndex, botAction, cd, extraActions, publicMode) {
	const out = [];
	const push = (cat, headline, text, priority, chain) => out.push({
		...mkNews(cat, headline, text, {
			priority,
			chain
		}),
		q: quarterIndex
	});
	const once = (key, gap) => {
		if ((cd[`news:${key}`] || 0) > 0) return false;
		cd[`news:${key}`] = gap;
		return true;
	};
	const tgt = Number.isFinite(s.inflationTarget) ? s.inflationTarget : CONFIG.target.inflation;
	let cbReported = false;
	[botAction, ...extraActions || []].filter(Boolean).forEach((act) => {
		const isCb = act.institution === "cb";
		const changedCourse = (isCb ? prev.botHeadline : prev.botHeadline2) !== act.headline;
		const newDemand = act.demand && (isCb ? prev.botDemand : prev.botDemand2) !== act.demand;
		if (changedCourse || newDemand) {
			if (isCb) cbReported = true;
			if (publicMode) push(isCb ? "cb" : "gov", act.publicHeadline || act.newsHeadline, `${act.publicNote || ""}${act.quote ? ` Из заявления по итогам решения: «${act.quote}»` : ""}`, 7);
			else push(isCb ? "cb" : "gov", act.newsHeadline, `${act.newsNote || act.note}${act.quote ? ` Из заявления по итогам решения: «${act.quote}»` : ""}${act.demand ? ` ${act.demand}` : ""}`, changedCourse || newDemand ? 8 : 5);
		}
	});
	const dRate = s.keyRate - prev.keyRate;
	if (!cbReported) {
		if (Math.abs(dRate) > .01) push("cb", `${dRate > 0 ? "ЦБ ПОВЫШАЕТ" : "ЦБ СНИЖАЕТ"} КЛЮЧЕВУЮ СТАВКУ ДО ${rf2(s.keyRate)}%`, `Шаг ${rfs2(dRate)} п.п. при инфляции ${rf1(s.inflation)}% и цели ${rf1(tgt)}%. Реальная ставка ${rfs(s.realPolicyRate)}% против нейтральной ${rf1(s.rStar)}% — условия ${s.rateGap > .3 ? "жёстче нейтральных" : s.rateGap < -.3 ? "мягче нейтральных" : "близки к нейтральным"}.`, 6);
		else if (Math.abs(dRate) < .01 && Math.abs(s.inflation - tgt) > 2 && once("hold", 4)) push("cb", `ЦБ СОХРАНЯЕТ СТАВКУ ${rf2(s.keyRate)}% ПРИ ИНФЛЯЦИИ ${rf1(s.inflation)}%`, `Бездействие — тоже решение. Ожидания ${rf1(s.inflationExpectations)}%, доверие к ЦБ ${Math.round(s.cbCredibility)} из 100.`, 5);
	}
	const dTarget = tgt - (Number.isFinite(prev.inflationTarget) ? prev.inflationTarget : CONFIG.target.inflation);
	if (Math.abs(dTarget) > .01) push("cb", `ЦБ ${dTarget > 0 ? "ПОВЫШАЕТ" : "СНИЖАЕТ"} ЦЕЛЬ ПО ИНФЛЯЦИИ ДО ${rf2(tgt)}%`, `Смена цели — не бухгалтерская правка, а заявление о намерениях. Доверие к ЦБ ${Math.round(s.cbCredibility)}: ожидания будут привыкать к новой цифре не один квартал, а пока они плавают, любое решение по ставке работает хуже.`, 9, [
		"Смена цели",
		"Доверие ↓",
		"Ожидания плывут",
		"Цена управления инфляцией ↑"
	]);
	if (decisions.fxRegime !== "free" && Math.abs((decisions.fxTarget || 0) - (prev.fxTarget || 0)) > .5) push("cb", `ЦБ ОБЪЯВЛЯЕТ НОВЫЙ ОРИЕНТИР КУРСА: ${rf1(decisions.fxTarget)}`, `Защита ориентира оплачивается резервами: сейчас ${fmtMoney(s.reserves)}, расход на удержание курса ${fmtMoneySigned(s.defenseIntervention || 0)} в год.`, 8);
	if (decisions.emergency) push("cb", "ЦБ ЗАПУСКАЕТ ЭКСТРЕННУЮ ПОДДЕРЖКУ БАНКОВ", `Капитал банковской системы пополнен, ликвидность восстановлена до ${Math.round(s.bankLiquidity)}. Плата — денежная эмиссия, инфляционный след и −доверие к ЦБ.`, 9, [
		"Экстренная помощь",
		"Капитал банков ↑",
		"Денежная масса ↑",
		"Инфляция ↑",
		"Доверие к ЦБ ↓"
	]);
	if (s.cbCredibility < 40 && prev.cbCredibility >= 40) push("cb", `ДОВЕРИЕ К ЦБ ПАДАЕТ ДО ${Math.round(s.cbCredibility)}: ОЖИДАНИЯ СРЫВАЮТСЯ С ЯКОРЯ`, `Инфляционные ожидания ${rf1(s.inflationExpectations)}% вместо цели ${rf1(tgt)}%. Теперь любое снижение инфляции потребует большего падения выпуска, чем раньше.`, 9, [
		"Доверие ↓",
		"Ожидания ↑",
		"Кривая Филлипса хуже",
		"Цена дезинфляции ↑"
	]);
	if (Math.abs(decisions.moneySupplyOp || 0) > .5 && once("qe", 2)) push("cb", `ЦБ ${decisions.moneySupplyOp > 0 ? "ВЫКУПАЕТ АКТИВЫ" : "ИЗЫМАЕТ ЛИКВИДНОСТЬ"}: ${rfs(decisions.moneySupplyOp)}% ДЕНЕЖНОЙ МАССЫ`, `Нестандартные операции при ставке ${rf2(s.keyRate)}%. Эффект на спрос быстрый, на цены — отложенный.`, 6);
	if (decisions.fxRegime !== prev.fxRegime) push("cb", `СМЕНА ВАЛЮТНОГО РЕЖИМА: ${decisions.fxRegime === "free" ? "СВОБОДНОЕ ПЛАВАНИЕ" : decisions.fxRegime === "managed" ? "УПРАВЛЯЕМЫЙ КУРС" : "ФИКСИРОВАННЫЙ КУРС"}`, `Резервы ${fmtMoney(s.reserves)}. Фиксировать курс значит обменивать инфляцию на резервы — пока резервы есть.`, 8);
	[
		["vatRate", "НДС"],
		["incomeTaxRate", "ПОДОХОДНЫЙ НАЛОГ"],
		["profitTaxRate", "НАЛОГ НА ПРИБЫЛЬ"],
		["exciseRate", "АКЦИЗЫ"],
		["capitalTaxRate", "НАЛОГ НА КАПИТАЛ"],
		["socialContribRate", "СОЦИАЛЬНЫЕ ВЗНОСЫ"]
	].forEach(([key, label]) => {
		const dv = s[key] - prev[key];
		if (key === "vatRate" && dv >= .5) return;
		if (Math.abs(dv) > .01) push("gov", `${label} ${dv > 0 ? "ПОВЫШЕН" : "СНИЖЕН"} ДО ${rf1(s[key])}%`, `Доходы бюджета ${rf1(s.revenuePctGdp)}% ВВП, теневая экономика ${rf1(s.shadowShare)}%. ${dv > 0 ? "Ставка растёт быстрее, чем доходы: часть базы уходит из-под налога." : "Выпадающие доходы придётся компенсировать — займами или расходами."}`, 6, dv > 0 ? [
			"Ставка ↑",
			"Собираемость ↓",
			"Теневая экономика ↑",
			"База ↓",
			"Доходы ↑ слабее ожидаемого"
		] : null);
	});
	if (Math.abs(s.fiscalImpulse) > .35 && once("fiscalImpulse", 4)) push("gov", `БЮДЖЕТНЫЙ ИМПУЛЬС ${rfs(s.fiscalImpulse)} П.П. ВВП`, `Мультипликатор сейчас ${s.outputGap < -1 ? "высокий: свободные мощности превращают расходы в выпуск" : "низкий: экономика близка к пределу, деньги уходят в цены"}. Дефицит ${rf1(Math.abs(s.budgetBalancePctGdp))}% ВВП.`, 6);
	if (s.interestToRevenue > 15 && prev.interestToRevenue <= 15) push("gov", `ОБСЛУЖИВАНИЕ ДОЛГА ЗАБИРАЕТ ${rf1(s.interestToRevenue)}% ДОХОДОВ БЮДЖЕТА`, "Проценты вытесняют из бюджета всё остальное — прежде всего инвестиции и образование, то есть будущий рост.", 8);
	const dSci = s.budgetShares.science - prev.budgetShares.science;
	const dEdu = s.budgetShares.education - prev.budgetShares.education;
	if ((Math.abs(dSci) > .4 || Math.abs(dEdu) > .4) && once("shares", 8)) push("gov", `ПРИОРИТЕТЫ БЮДЖЕТА МЕНЯЮТСЯ: НАУКА ${rf1(s.budgetShares.science)}%, ОБРАЗОВАНИЕ ${rf1(s.budgetShares.education)}%`, `Эти статьи не дают эффекта в этом квартале. Они меняют производительность и человеческий капитал — потенциальный рост сейчас ${rf1(s.potentialGrowth)}%.`, 5, [
		"Наука и образование",
		"Человеческий капитал ↑",
		"Производительность ↑",
		"Потенциальный ВВП ↑ через годы"
	]);
	if (Math.abs(s.fxDeprAnnual) > 6 && once("fx", 3)) push("markets", `ВАЛЮТА ${s.fxDeprAnnual > 0 ? "ПАДАЕТ" : "УКРЕПЛЯЕТСЯ"}: ${rfs(s.fxDeprAnnual)}% В ГОДОВОМ ВЫРАЖЕНИИ`, `Текущий счёт ${fmtMoneySigned(s.currentAccount)}, приток капитала ${fmtMoneySigned(s.netCapitalFlow)}, резервы ${fmtMoney(s.reserves)}. Перенос курса в цены импорта: ${rf1(s.importPriceInflation)}%.`, 7, s.fxDeprAnnual > 0 ? [
		"Отток валюты",
		"Курс ↓",
		"Импорт дорожает",
		"Инфляция ↑",
		"Реальные доходы ↓"
	] : null);
	if (s.riskPremium - prev.riskPremium > .35 && once("risk", 5)) push("markets", `ПРЕМИЯ ЗА СТРАНОВОЙ РИСК РАСТЁТ ДО ${rf1(s.riskPremium)} П.П.`, `Инвесторы закладывают долг ${rf1(s.debtToGdp)}% ВВП, банковский риск ${Math.round(s.bankingRisk)} и согласованность политики ${Math.round(s.policyCoordination)} из 100. Дороже становится всё: госдолг, кредит, капитал.`, 7);
	if (s.reserves < 150 && prev.reserves >= 150) push("markets", `РЕЗЕРВЫ СОКРАТИЛИСЬ ДО ${fmtMoney(s.reserves)}`, "Запас прочности для защиты курса тает. Если режим не свободный, рынок начнёт проверять его на прочность.", 8);
	if (s.bankNPL > 7 && s.bankNPL - prev.bankNPL > .25 && once("npl", 4)) push("markets", `ПРОСРОЧКА В БАНКАХ ДОСТИГЛА ${rf1(s.bankNPL)}%`, `Убытки съедают капитал: достаточность ${rf1(s.bankCapitalAdequacy)}% при требовании ${rf1(s.capitalRequirement)}%. Прибыль сектора ${fmtMoneySigned(s.bankProfit)} за квартал.`, 8, [
		"Просрочка ↑",
		"Убытки ↑",
		"Капитал ↓",
		"Кредитование ↓",
		"ВВП ↓",
		"Просрочка ↑"
	]);
	if (s.investmentGrowth < -3 && prev.investmentGrowth >= -3 && once("inv", 5)) push("business", `ИНВЕСТИЦИИ ПАДАЮТ НА ${rf1(Math.abs(s.investmentGrowth))}%`, `Реальная ставка по кредитам ${rf1(s.realLendingRate)}% против нейтральных ${rf1(s.rStar + 2)}%. Сокращение инвестиций сегодня — это меньший капитал и меньший потенциал завтра.`, 7);
	if (s.businessConfidence < 40 && prev.businessConfidence >= 40) push("business", `ДЕЛОВЫЕ НАСТРОЕНИЯ УХУДШАЮТСЯ: ИНДЕКС ${Math.round(s.businessConfidence)}`, `Компании откладывают найм и инвестиции. Разрыв выпуска ${rfs(s.outputGap)}%, банковский риск ${Math.round(s.bankingRisk)}.`, 6);
	if (s.tfpGrowth > prev.tfpGrowth + .15 && once("tfp", 6)) push("business", `ПРОИЗВОДИТЕЛЬНОСТЬ УСКОРЯЕТСЯ: ${rf1(s.tfpGrowth)}% В ГОД`, `Индекс TFP ${rf1(s.productivity)}, инфраструктура ${rf1(s.infrastructureIndex)}. Единственный источник роста, который не оплачивается инфляцией.`, 5);
	const realWage = s.wageGrowth - s.inflation;
	const prevRealWage = prev.wageGrowth - prev.inflation;
	if (realWage < 0 && prevRealWage >= 0) push("households", `РЕАЛЬНЫЕ ЗАРПЛАТЫ ПЕРЕШЛИ К ПАДЕНИЮ: ${rfs(realWage)}%`, `Номинальный рост ${rf1(s.wageGrowth)}% не поспевает за инфляцией ${rf1(s.inflation)}%. Дальше — слабое потребление и требования индексации.`, 7, [
		"Инфляция ↑",
		"Реальные доходы ↓",
		"Потребление ↓",
		"Спрос ↓"
	]);
	else if (realWage > 3 && prevRealWage <= 3) push("households", `РЕАЛЬНЫЕ ЗАРПЛАТЫ РАСТУТ НА ${rf1(realWage)}%`, `При напряжённости рынка труда ${rfs(s.tightness)} п.п. и производительности ${rf1(s.tfpGrowth)}% рост зарплат ${realWage > s.tfpGrowth + 1.5 ? "опережает производительность — это будущая инфляция издержек" : "обеспечен производительностью"}.`, 6);
	if (s.unemployment - prev.unemployment > .35 && once("unemp", 4)) push("households", `БЕЗРАБОТИЦА РАСТЁТ ДО ${rf1(s.unemployment)}%`, `Естественный уровень ${rf1(s.nairu)}% — разрыв ${rfs(s.unemployment - s.nairu)} п.п. Долгая безработица поднимает и сам естественный уровень: часть потерь станет необратимой.`, 7);
	if (s.tightness > 1.2 && prev.tightness <= 1.2) push("households", `ДЕФИЦИТ РАБОТНИКОВ: БЕЗРАБОТИЦА ${rf1(s.unemployment)}% НИЖЕ ЕСТЕСТВЕННОЙ`, `Доля вакансий ${rf1(s.vacancyRate)}%, зарплаты ускоряются до ${rf1(s.wageGrowth)}%. Низкая безработица не бесплатна: удельные издержки труда ${rf1(s.unitLaborCostGrowth)}% переходят в цены.`, 7, [
		"Безработица ↓",
		"Дефицит кадров",
		"Зарплаты ↑",
		"Издержки ↑",
		"Инфляция ↑",
		"Ставка ↑"
	]);
	if (s.consumerConfidence < 35 && prev.consumerConfidence >= 35) push("households", `ПОТРЕБИТЕЛЬСКИЕ НАСТРОЕНИЯ НА МИНИМУМЕ: ${Math.round(s.consumerConfidence)}`, "Домохозяйства переходят к сберегательной модели. Спрос будет слабым даже при снижении ставки.", 6);
	if (Math.abs(s.worldGdpGrowth - prev.worldGdpGrowth) > .5 && once("world", 5)) push("world", `МИРОВАЯ ЭКОНОМИКА ${s.worldGdpGrowth > prev.worldGdpGrowth ? "УСКОРЯЕТСЯ" : "ЗАМЕДЛЯЕТСЯ"}: ${rf1(s.worldGdpGrowth)}%`, `Внешний спрос — это ваш экспорт ${fmtMoney(s.exports)}. Индекс мирового спроса ${rf1(s.worldDemandIndex)}.`, 5);
	if (Math.abs(s.commodityIndex - prev.commodityIndex) > 6 && once("comm", 4)) push("world", `СЫРЬЕВОЙ ИНДЕКС ${s.commodityIndex > prev.commodityIndex ? "РАСТЁТ" : "ПАДАЕТ"} ДО ${rf1(s.commodityIndex)}`, `Торговый баланс ${fmtMoneySigned(s.tradeBalance)}: страна ${s.tradeBalance >= 0 ? "выигрывает от дорогого сырья" : "платит за него"}.`, 5);
	if (s.regime === "normal" && prev.regime !== "normal" && prev.regime !== "war" && prev.regime !== "pandemic") {
		const info = REGIME_INFO.normal;
		push("crisis", `ЭКОНОМИКА ВОЗВРАЩАЕТСЯ В НОРМАЛЬНЫЙ РЕЖИМ`, regimeInfoText(info, s), 6);
	}
	if (s.stockReturn < -9 && once("crash", 3)) push("markets", `ОБВАЛ НА ФОНДОВОМ РЫНКЕ: ИНДЕКС ${rf1(s.stockReturn)}%`, `Индекс опустился до ${rf1(s.stockIndex)}, капитализация ${rf1(s.marketCapPctGdp)}% ВВП. Ставка дисконтирования выросла до ${rf1(s.discountRate)}% — рынок пересчитал будущие прибыли по новой цене денег. Индекс страха ${rf1(s.volatilityIndex)}.`, 8, [
		"Ставка ↑ / риск ↑",
		"Дисконт ↑",
		"Оценка активов ↓",
		"Капитализация ↓",
		"Богатство и залоги ↓"
	]);
	else if (s.stockReturn > 9 && once("rally", 4)) push("markets", `РАЛЛИ НА РЫНКЕ АКЦИЙ: ИНДЕКС ${rfs(s.stockReturn)}%`, `Капитализация выросла до ${rf1(s.marketCapPctGdp)}% ВВП при P/E ${rf1(s.stockPE)}. Дешёвые деньги поднимают цены активов быстрее, чем прибыли — именно так надуваются пузыри, которые потом приходится разбирать ставкой.`, 6);
	const SECTORS = [
		[
			"sectorBanks",
			"БАНКОВСКИЙ",
			"банки живут маржой и качеством портфеля"
		],
		[
			"sectorIndustry",
			"ПРОМЫШЛЕННЫЙ",
			"промышленность зависит от инвестиционного цикла и стоимости денег"
		],
		[
			"sectorConsumer",
			"ПОТРЕБИТЕЛЬСКИЙ",
			"потребительский сектор следует за реальными доходами"
		],
		[
			"sectorResources",
			"СЫРЬЕВОЙ",
			"сырьевой сектор торгует мировыми ценами и курсом"
		],
		[
			"reitIndex",
			"НЕДВИЖИМОСТЬ",
			"недвижимость переоценивается вслед за ставкой по кредитам"
		]
	];
	let bestSec = null;
	SECTORS.forEach(([key, label, why]) => {
		if (!prev[key] || !s[key]) return;
		const r = (s[key] / prev[key] - 1) * 100;
		const rel = r - s.stockReturn;
		if (!bestSec || Math.abs(rel) > Math.abs(bestSec.rel)) bestSec = {
			key,
			label,
			why,
			r,
			rel
		};
	});
	if (bestSec && Math.abs(bestSec.rel) > 4.5 && once("sector", 3)) push("markets", `${bestSec.label} СЕКТОР ${bestSec.r >= 0 ? "ВЫРОС" : "УПАЛ"} НА ${rf1(Math.abs(bestSec.r))}% — ${bestSec.rel >= 0 ? "ЛУЧШЕ" : "ХУЖЕ"} РЫНКА НА ${rf1(Math.abs(bestSec.rel))} П.П.`, `Рынок целиком ${rfs(s.stockReturn)}%, но ${bestSec.why}. Расхождение секторов — это подсказка о том, какой канал политики работает прямо сейчас.`, 7);
	if (s.curveInverted && !prev.curveInverted && once("invert", 6)) push("markets", `КРИВАЯ ДОХОДНОСТИ ИНВЕРТИРОВАЛАСЬ: ${rf1(s.curveSlope)} П.П.`, `Короткие ставки ${rf1(s.yield3m)}% выше длинных ${rf1(s.yield10y)}%. Рынок фактически говорит: нынешняя жёсткость сломает спрос, и ставку придётся снижать. Исторически это лучший из ранних сигналов рецессии.`, 8, [
		"Ставка ↑",
		"Ожидания снижения",
		"Инверсия кривой",
		"Рецессия через 3–6 кв."
	]);
	if (s.sovereignSpread > 400 && s.sovereignSpread - (prev.sovereignSpread || 0) > 60 && once("spread", 4)) push("markets", `СУВЕРЕННЫЙ СПРЕД РАСШИРИЛСЯ ДО ${Math.round(s.sovereignSpread)} Б.П.`, `Занимать становится дорого: доходность 10 лет ${rf1(s.yield10y)}% при долге ${rf1(s.debtToGdp)}% ВВП. Корпоративный спред ${Math.round(s.corporateSpread)} б.п. — стоимость денег растёт для всех, а не только для бюджета.`, 8);
	if (s.bankPB < .35 && once("bankpb", 6)) push("markets", `РЫНОК ОЦЕНИВАЕТ БАНКИ ДЕШЕВЛЕ ИХ КАПИТАЛА: P/B ${rf2(s.bankPB)}`, `Инвесторы не верят в отчётный капитал: просрочка ${rf1(s.bankNPL)}%, рентабельность ${rf1(s.bankROE)}%. Привлечь новый капитал с рынка в таком состоянии почти невозможно — а именно он ограничивает кредитование.`, 8, [
		"Просрочка ↑",
		"Прибыль ↓",
		"Оценка банков ↓",
		"Капитал не привлечь",
		"Кредит ↓"
	]);
	const realW = s.wageGrowth - s.inflation;
	const VOICES = [
		{
			id: "pensioner_infl",
			p: 8,
			when: () => s.inflation > 7,
			q: "«Я перестала смотреть на ценники — всё равно они другие каждую неделю»",
			who: "Тамара Николаевна, 68 лет, получатель социальных выплат",
			t: () => `Инфляция ${rf1(s.inflation)}% при индексации выплат, отстающей от цен. Для людей с фиксированным доходом инфляция — это не показатель, а прямой вычет из тарелки.`
		},
		{
			id: "mortgage",
			p: 7,
			when: () => s.lendingRate > 11,
			q: "«Ставка по кредиту такая, что мы просто отложили покупку квартиры»",
			who: "Артём и Лена, семья из областного центра",
			t: () => `Ставка по кредитам ${rf1(s.lendingRate)}% при инфляции ${rf1(s.inflation)}%. Жёсткая политика работает именно так: сначала отменяются чужие планы, и только потом замедляются цены.`
		},
		{
			id: "smb",
			p: 7,
			when: () => s.rateGap > 1.2 || s.creditCrunch,
			q: "«Банк не отказал напрямую — просто перестал отвечать»",
			who: "Игорь, владелец мебельного производства, 40 сотрудников",
			t: () => `${s.creditCrunch ? "Капитал банков упёрся в норматив" : "Кредит подорожал"}: рост портфеля ${rfs(s.creditGrowth)}%. Малый бизнес чувствует денежную политику раньше статистики.`
		},
		{
			id: "worker",
			p: 8,
			when: () => s.unemployment > s.nairu + 1.2,
			q: "«На заводе третий месяц неполная неделя»",
			who: "Сергей, оператор линии",
			t: () => `Безработица ${rf1(s.unemployment)}% против естественных ${rf1(s.nairu)}%. За разрывом выпуска ${rfs(s.outputGap)}% стоят конкретные смены, которых больше нет.`
		},
		{
			id: "hr",
			p: 6,
			when: () => s.tightness > 1,
			q: "«Мы поднимаем зарплату дважды в год и всё равно не закрываем вакансии»",
			who: "Марина, директор по персоналу в логистике",
			t: () => `Доля вакансий ${rf1(s.vacancyRate)}%, зарплаты растут на ${rf1(s.wageGrowth)}%. Дефицит кадров приятен для работника и тяжёл для цен.`
		},
		{
			id: "trader",
			p: 6,
			when: () => Math.abs(s.fxDeprAnnual) > 7 || s.riskPremium > 3,
			q: "«Рынок торгует не вашей статистикой, а доверием к ней»",
			who: "Дмитрий, управляющий портфелем",
			t: () => `Премия за риск ${rf1(s.riskPremium)} п.п., курс ${rfs(s.fxDeprAnnual)}% годовых. Резервы ${fmtMoney(s.reserves)} — цифра, которую считают все, кто решает, оставаться ли в стране.`
		},
		{
			id: "foreign_aid",
			p: 9,
			when: () => (s.warQuartersLeft || 0) > 0 && s.warType === "defensive",
			q: "«Кредитная линия союзников пришла быстрее, чем собственный бюджетный перевод»",
			who: "Представитель профильного ведомства",
			t: () => `Оборонительная война вызывает сочувствие союзников: чистый приток капитала ${fmtMoney(s.netCapitalFlow)}, резервы ${fmtMoney(s.reserves)}. Опираться на чужую щедрость долго нельзя — но пока она держит платёжный баланс.`
		},
		{
			id: "sanctions_exporter",
			p: 9,
			when: () => (s.warQuartersLeft || 0) > 0 && s.warType === "offensive",
			q: "«Полгода назад у нас были контракты на три года вперёд, теперь — ни одного»",
			who: "Экспортёр промышленного оборудования",
			t: () => `Наступательная война обернулась санкциями: торговый баланс ${fmtMoney(s.tradeBalance)}, премия за риск ${rf1(s.riskPremium)} п.п. Рынки закрываются быстрее, чем открываются новые.`
		},
		{
			id: "econ_hawk",
			p: 7,
			when: () => s.inflationExpectations > tgt + 2,
			q: "«Проблема уже не в ценах, а в том, что в цель никто не верит»",
			who: "Ольга Р., экономист, колонка в деловом еженедельнике",
			t: () => `Ожидания ${rf1(s.inflationExpectations)}% при цели ${rf1(tgt)}%. Заякоренные ожидания — это бесплатный инструмент, а разъякоренные приходится выкупать безработицей.`
		},
		{
			id: "econ_dove",
			p: 6,
			when: () => s.outputGap < -2.5 && s.inflation < tgt + 1 && s.rateGap > .3,
			q: "«Мы лечим болезнь, которой нет, и получаем ту, что есть»",
			who: "Павел К., профессор макроэкономики",
			t: () => `Разрыв выпуска ${rfs(s.outputGap)}% при инфляции ${rf1(s.inflation)}%. Держать жёсткие условия, когда спрос и так слаб, — значит превращать циклическую безработицу в структурную.`
		},
		{
			id: "union",
			p: 7,
			when: () => realW < -1,
			q: "«Индексация ниже инфляции — это не повышение, это торг о размере потери»",
			who: "Представитель профсоюза работников транспорта",
			t: () => `Реальные зарплаты ${rfs(realW)}% при росте номинальных ${rf1(s.wageGrowth)}%. Требования индексации — следующий пункт повестки, а за ними инфляция издержек.`
		},
		{
			id: "biz_tax",
			p: 7,
			when: () => s.taxWedgeValue > 42 || s.shadowShare > 20,
			q: "«Половина знакомых перешла на серые схемы — не от жадности, а от арифметики»",
			who: "Анна, бухгалтер, ведёт два десятка ИП",
			t: () => `Теневая экономика ${rf1(s.shadowShare)}% при налоговом клине ${rf1(s.taxWedgeValue)}. База уходит тихо и возвращается неохотно — даже если ставки потом снизить.`
		},
		{
			id: "depositor",
			p: 9,
			when: () => s.bankingRisk > 60,
			q: "«В очереди у банкомата стояли люди, которые никогда там не стояли»",
			who: "Наблюдение корреспондента в областном центре",
			t: () => `Банковский риск ${Math.round(s.bankingRisk)} из 100, ликвидность ${Math.round(s.bankLiquidity)}. Паника — единственный экономический процесс, который разгоняет сам себя быстрее, чем кто-либо успевает среагировать.`
		},
		{
			id: "optimist",
			p: 5,
			when: () => s.gdpGrowth > 3 && s.inflation < tgt + 1.5 && s.unemployment < s.nairu + .5,
			q: "«Впервые за годы мы планируем на три года вперёд, а не на квартал»",
			who: "Руслан, основатель производственной компании",
			t: () => `Рост ${rf1(s.gdpGrowth)}% при инфляции ${rf1(s.inflation)}% и разрыве выпуска ${rfs(s.outputGap)}%. Предсказуемость — тот редкий ресурс, который создаётся политикой, а не покупается.`
		},
		{
			id: "region",
			p: 6,
			when: () => (s.sequesterFactor || 1) < .995 || s.budgetBalancePctGdp < -7,
			q: "«Нам сказали: стройку заморозить, зарплаты оставить»",
			who: "Глава администрации небольшого города",
			t: () => `Дефицит ${rf1(Math.abs(s.budgetBalancePctGdp))}% ВВП. Когда бюджет режут, первыми уходят инвестиции — то есть будущий рост, у которого нет своего профсоюза.`
		},
		{
			id: "student",
			p: 5,
			when: () => s.unemployment > 6.5,
			q: "«Диплом есть, работы нет — беру любую подработку»",
			who: "Камиль, выпускник технического вуза",
			t: () => `Безработица ${rf1(s.unemployment)}%. Молодёжь всегда первой выпадает из найма и последней возвращается — отсюда и растущий естественный уровень безработицы ${rf1(s.nairu)}%.`
		},
		{
			id: "farmer",
			p: 5,
			when: () => s.commodityIndex > 108 || s.inflation > 7,
			q: "«Солярка подорожала раньше, чем мы успели продать урожай»",
			who: "Владимир, фермерское хозяйство",
			t: () => `Сырьевой индекс ${rf1(s.commodityIndex)} при инфляции ${rf1(s.inflation)}%. Издержки приходят к производителю быстрее, чем цены его продукции.`
		},
		{
			id: "importer",
			p: 6,
			when: () => s.fxDeprAnnual > 5,
			q: "«Мы пересчитываем прайс раз в две недели, и клиенты это ненавидят»",
			who: "Ксения, импорт бытовой техники",
			t: () => `Курс ослаб на ${rf1(s.fxDeprAnnual)}% годовых, цены импорта растут на ${rf1(s.importPriceInflation)}%. Перенос курса в ценники — самый быстрый канал инфляции.`
		},
		{
			id: "exporter",
			p: 5,
			when: () => s.fxDeprAnnual > 4 && s.exports > s.imports * .95,
			q: "«Слабый курс — наш единственный бонус за последние годы»",
			who: "Директор экспортного предприятия",
			t: () => `Торговый баланс ${fmtMoneySigned(s.tradeBalance)}. Девальвация перекладывает доход от покупателя импорта к экспортёру — это перераспределение, а не рост.`
		},
		{
			id: "banker",
			p: 6,
			when: () => s.netInterestMargin > 5 || s.bankROE > 15,
			q: "«Мы зарабатываем на разнице ставок, а не на экономике — это тревожный признак»",
			who: "Зампред одного из крупных банков",
			t: () => `Процентная маржа ${rf2(s.netInterestMargin)} п.п., рентабельность ${rf1(s.bankROE)}%. Когда банкам выгоднее держать деньги, чем кредитовать, страдает инвестиционный цикл.`
		},
		{
			id: "realtor",
			p: 5,
			when: () => s.creditGap > 4,
			q: "«Очереди на ипотеку — как в лучшие годы, и это меня пугает»",
			who: "Агент по недвижимости",
			t: () => `Кредитный разрыв ${rfs(s.creditGap)} п.п. ВВП. Кредитные бумы приятны в моменте и дороги через два-три года, когда приходит просрочка.`
		},
		{
			id: "nurse",
			p: 6,
			when: () => s.budgetShares.health < 15,
			q: "«В больнице снова нет расходников, зато есть оптимизация»",
			who: "Медсестра районной больницы",
			t: () => `Доля здравоохранения ${rf1(s.budgetShares.health)}% бюджетных расходов. Это не только про людей — человеческий капитал ${rf1(s.humanCapitalIndex)} прямо входит в потенциальный ВВП.`
		},
		{
			id: "teacher",
			p: 6,
			when: () => s.budgetShares.education < 14,
			q: "«Молодые учителя не приходят, а старые уходят»",
			who: "Директор школы",
			t: () => `На образование идёт ${rf1(s.budgetShares.education)}% расходов. Эффект этой цифры вы увидите не в этом квартале, а через десять лет — в темпе роста потенциала ${rf1(s.potentialGrowth)}%.`
		},
		{
			id: "scientist",
			p: 5,
			when: () => s.budgetShares.science < 3,
			q: "«Лаборатория закрыта, гранта нет, коллеги уехали»",
			who: "Научный сотрудник института",
			t: () => `Наука получает ${rf1(s.budgetShares.science)}% расходов. Производительность ${rf1(s.productivity)} растёт на ${rf1(s.tfpGrowth)}% в год — единственный источник роста, который не оплачивается инфляцией.`
		},
		{
			id: "engineer_boom",
			p: 5,
			when: () => s.investmentGrowth > 5,
			q: "«Нам впервые за годы согласовали новую линию»",
			who: "Главный инженер завода",
			t: () => `Инвестиции растут на ${rf1(s.investmentGrowth)}% при реальной ставке по кредитам ${rf1(s.realLendingRate)}%. Сегодняшние инвестиции — это завтрашний потенциал, а не сегодняшний спрос.`
		},
		{
			id: "retiree_ok",
			p: 4,
			when: () => s.inflation < s.inflationTarget + .5 && s.wageGrowth - s.inflation > 0,
			q: "«Я снова понимаю, сколько стоит поход в магазин»",
			who: "Галина Петровна, пенсионерка",
			t: () => `Инфляция ${rf1(s.inflation)}% при цели ${rf1(tgt)}%. Предсказуемость цен — та форма благополучия, которую замечают, только когда её теряют.`
		},
		{
			id: "fund_manager",
			p: 6,
			when: () => s.volatilityIndex > 45,
			q: "«Мы вышли в короткие облигации и ждём — рынок не про фундамент сейчас»",
			who: "Управляющий пенсионным фондом",
			t: () => `Индекс страха ${rf1(s.volatilityIndex)}, премия за риск акций ${rf1(s.equityRiskPremium)}%. Когда все уходят в короткие бумаги, длинные деньги для экономики исчезают.`
		},
		{
			id: "ceo_invert",
			p: 7,
			when: () => s.curveInverted,
			q: "«Банк предлагает депозит доходнее, чем мой собственный проект»",
			who: "Основатель промышленной группы",
			t: () => `Короткие ставки ${rf1(s.yield3m)}% против длинных ${rf1(s.yield10y)}%. Инверсия кривой — это когда экономике выгоднее ждать, чем строить.`
		},
		{
			id: "accountant_sequester",
			p: 8,
			when: () => (s.sequesterFactor || 1) < .995,
			q: "«Контракты подписаны, деньги отозваны — объясняйте это подрядчикам сами»",
			who: "Финансовый директор госпредприятия",
			t: () => `Секвестр урезал расходы на ${rf1((1 - s.sequesterFactor) * 100)}%. Когда рынок отказывается финансировать дефицит, выбор делает уже не правительство.`
		},
		{
			id: "journalist_elect",
			p: 6,
			when: () => !s.noElections && s.quartersToElection <= 3,
			q: "«Обещаний в этом квартале больше, чем в предыдущие два года»",
			who: "Политический обозреватель",
			t: () => pressControlled(s) ? `До голосования ${s.quartersToElection} кв. Предвыборные расходы государства всё равно оплачиваются после голосования — обычно ставкой.` : `До выборов ${s.quartersToElection} кв., рейтинг власти ${Math.round(s.approval)}. Предвыборные расходы всегда оплачиваются после выборов — обычно ставкой.`
		},
		{
			id: "mayor_fund",
			p: 4,
			when: () => (s.fundPctGdp || 0) > 4,
			q: "«Впервые за долгое время у страны есть подушка, а не только долги»",
			who: "Экономический обозреватель",
			t: () => `Суверенный фонд ${fmtMoney(s.sovereignFund)} (${rf1(s.fundPctGdp)}% ВВП) при долге ${rf1(s.debtToGdp)}% ВВП. Чистый долг ${rf1(s.netDebtToGdp)}% — именно эту цифру смотрят инвесторы.`
		},
		{
			id: "trader_street",
			p: 5,
			when: () => Math.abs(s.stockReturn) > 6,
			q: () => s.stockReturn > 0 ? "«Все вдруг стали экспертами по акциям»" : "«Портфель за квартал похудел сильнее, чем я за год»",
			who: "Частный инвестор",
			t: () => `Индекс ${rfs(s.stockReturn)}% за квартал, капитализация ${rf1(s.marketCapPctGdp)}% ВВП. Цены активов реагируют на ставку раньше, чем выпуск и занятость.`
		},
		{
			id: "union_strike",
			p: 8,
			when: () => s.wageGrowth - s.inflation < -2.5,
			q: "«Если индексации не будет, встанут цеха»",
			who: "Забастовочный комитет",
			t: () => `Реальные зарплаты ${rfs(s.wageGrowth - s.inflation)}%. Дальше либо индексация и инфляция издержек, либо конфликт — третьего пути у этой развилки обычно нет.`
		},
		{
			id: "econ_coord",
			p: 6,
			when: () => s.policyCoordination < 35,
			q: "«Одно ведомство жмёт газ, другое — тормоз, а изнашивается вся машина»",
			who: "Профессор, бывший советник правительства",
			t: () => `Согласованность политики ${Math.round(s.policyCoordination)} из 100. Несогласованность стоит стране премии за риск ${rf1(s.riskPremium)} п.п. и лишних процентов по долгу.`
		},
		{
			id: "young_family",
			p: 5,
			when: () => s.lendingRate < 7 && s.inflation < 6,
			q: "«Мы взяли кредит на ремонт — впервые ставка выглядит разумной»",
			who: "Молодая семья",
			t: () => `Ставка по кредитам ${rf1(s.lendingRate)}% при инфляции ${rf1(s.inflation)}%. Дешёвые деньги приятны домохозяйствам и опасны балансам банков — вопрос в том, надолго ли.`
		},
		{
			id: "saver",
			p: 5,
			when: () => s.depositRate - s.inflation < -2,
			q: "«Деньги на вкладе тают, но куда их ещё нести — непонятно»",
			who: "Виктор, инженер, откладывает на образование детей",
			t: () => `Реальная ставка по депозитам ${rfs(s.depositRate - s.inflation)}%. Отрицательная реальная доходность — это налог, который никто не голосовал.`
		}
	];
	const BASELINE_VOICES = [
		{
			id: "base_wage",
			p: 3,
			when: () => realW >= .5,
			q: "«Зарплата наконец обгоняет ценники — не сильно, но обгоняет»",
			who: "Николай, мастер на складе",
			t: () => `Реальные доходы ${rfs(realW)}% при инфляции ${rf1(s.inflation)}%. Такие кварталы люди запоминают лучше, чем любые показатели с панели.`
		},
		{
			id: "base_orders",
			p: 3,
			when: () => s.gdpGrowth < s.potentialGrowth - .3,
			q: "«Заказов стало меньше, но увольнять пока некого»",
			who: "Елена, владелица типографии",
			t: () => `Рост ${rf1(s.gdpGrowth)}% при потенциале ${rf1(s.potentialGrowth)}%. Бизнес сначала теряет выручку и только потом сокращает людей — поэтому безработица всегда опаздывает.`
		},
		{
			id: "base_analyst",
			p: 3,
			when: () => true,
			q: () => s.policyCoordination < 45 ? "«Два ведомства тянут экономику в разные стороны, и оплачивает это третий — гражданин»" : "«Политика выглядит связной, а связность сама по себе стоит процента роста»",
			who: "Еженедельный экономический обзор",
			t: () => `Согласованность политики ${Math.round(s.policyCoordination)} из 100 при ставке ${rf2(s.keyRate)}% и балансе бюджета ${rfs(s.budgetBalancePctGdp)}% ВВП. Когда бюджет разгоняет спрос, а ЦБ его тормозит, обе стороны тратят ресурсы впустую.`
		},
		{
			id: "base_street",
			p: 2,
			when: () => true,
			q: () => s.inflation > tgt + 1 ? "«Цены в магазине у дома объясняют экономику лучше любого отчёта»" : "«Ценники стоят на месте, и это уже новость»",
			who: "Опрос на улице, областной центр",
			t: () => `Инфляция ${rf1(s.inflation)}% при цели ${rf1(tgt)}%, потребительские настроения ${Math.round(s.consumerConfidence)} из 100. Люди судят об экономике по корзине, а не по разрыву выпуска.`
		}
	];
	let picked = VOICES.filter((v) => v.when()).sort((a, b) => b.p - a.p).filter((v) => once(`op:${v.id}`, 7)).slice(0, 1);
	if (picked.length === 0) {
		const pool = BASELINE_VOICES.filter((v) => v.when());
		picked = pool.map((_, i) => pool[((i + quarterIndex) % pool.length + pool.length) % pool.length]).filter((v) => once(`op:${v.id}`, 4)).slice(0, 1);
	}
	picked.forEach((v) => push("opinion", typeof v.q === "function" ? v.q() : v.q, `${v.who}. ${v.t()}`, 4));
	return out;
}
function buildDecisionImpulses(dec, s, difficulty) {
	const out = [];
	const dVat = dec.vatRate - s.vatRate;
	if (Math.abs(dVat) > 1e-6) {
		out.push(makeImpulse("vatPrices", dVat * CONFIG.coef.vatPass, `Изменение НДС до ${ruNum(dec.vatRate, 1)}% напрямую переносится в розничные цены`, "fast", difficulty, "inflation"));
		out.push(makeImpulse("consumption", -dVat * .35, `Изменение НДС до ${ruNum(dec.vatRate, 1)}% меняет реальные доходы домохозяйств`, "default", difficulty));
	}
	const dExcise = dec.exciseRate - s.exciseRate;
	if (Math.abs(dExcise) > 1e-6) {
		out.push(makeImpulse("vatPrices", dExcise * .12, `Изменение акцизов до ${ruNum(dec.exciseRate, 1)}%`, "fast", difficulty, "inflation"));
		out.push(makeImpulse("consumption", -dExcise * .14, `Изменение акцизов до ${ruNum(dec.exciseRate, 1)}%`, "default", difficulty));
	}
	const dIncome = dec.incomeTaxRate - s.incomeTaxRate;
	if (Math.abs(dIncome) > 1e-6) out.push(makeImpulse("consumption", -dIncome * .3, `${dIncome > 0 ? "Повышение" : "Снижение"} подоходного налога до ${ruNum(dec.incomeTaxRate, 1)}% меняет располагаемый доход`, "default", difficulty));
	const dSocial = dec.socialContribRate - s.socialContribRate;
	if (Math.abs(dSocial) > 1e-6) {
		out.push(makeImpulse("unemployment", dSocial * .045, `Изменение социальных взносов до ${ruNum(dec.socialContribRate, 1)}% меняет стоимость труда для работодателя`, "default", difficulty));
		out.push(makeImpulse("investment", -dSocial * .2, `Изменение социальных взносов до ${ruNum(dec.socialContribRate, 1)}%`, "default", difficulty));
	}
	const dProfit = dec.profitTaxRate - s.profitTaxRate;
	if (Math.abs(dProfit) > 1e-6) out.push(makeImpulse("businessConfidence", -dProfit * .8, `${dProfit > 0 ? "Повышение" : "Снижение"} налога на прибыль до ${ruNum(dec.profitTaxRate, 1)}%`, "default", difficulty, "other"));
	const dCapital = dec.capitalTaxRate - s.capitalTaxRate;
	if (Math.abs(dCapital) > 1e-6) out.push(makeImpulse("capitalFlow", -dCapital * 6, `Изменение налога на капитал до ${ruNum(dec.capitalTaxRate, 1)}% влияет на приток капитала`, "default", difficulty));
	if (Math.abs(dec.moneySupplyOp || 0) > 1e-6) {
		out.push(makeImpulse("inflationSupply", dec.moneySupplyOp * .14, `${dec.moneySupplyOp > 0 ? "Расширение" : "Сжатие"} денежной массы на ${fmtSigned1(dec.moneySupplyOp)}%`, "slow", difficulty, "inflation"));
		out.push(makeImpulse("investment", dec.moneySupplyOp * .35, `Операции с денежной массой (${fmtSigned1(dec.moneySupplyOp)}%)`, "default", difficulty));
		out.push(makeImpulse("creditDemand", dec.moneySupplyOp * .4, `Операции с денежной массой (${fmtSigned1(dec.moneySupplyOp)}%)`, "default", difficulty));
	}
	if (dec.emergency) {
		out.push(makeImpulse("inflationSupply", .45, "Экстренная поддержка банков: эмиссионное финансирование", "slow", difficulty, "inflation"));
		out.push(makeImpulse("govTrust", -2.5, "Экстренная поддержка банков за счёт бюджета и эмиссии", "fast", difficulty, "other"));
	}
	const dReserve = dec.reserveReq - s.reserveReq;
	if (Math.abs(dReserve) > 1e-6) out.push(makeImpulse("creditDemand", -dReserve * .5, `Изменение нормы резервирования до ${ruNum(dec.reserveReq, 1)}%`, "default", difficulty, "banking"));
	const bondIssuance = Math.max(0, dec.bondIssuance || 0);
	if (bondIssuance > .01) out.push(makeImpulse("riskPremium", bondIssuance / Math.max(1, s.nominalGdp) * 100 * .6, `Минфин разместил облигации на ${fmtMoney(bondIssuance)} сверх необходимого для покрытия дефицита`, "default", difficulty));
	return out.filter((im) => im.values.some((x) => Math.abs(x) > 1e-9));
}
// src/lib/politics/requests.js
const askNum = (n) => String(Number(Number(n).toFixed(2))).replace(".", ",");
function fitStrength(req, s, strength = 1) {
	const str = Number.isFinite(strength) ? strength : 1;
	if (!req || !req.scale || !req.room || !s) return str;
	const step = req.scale.step;
	const can = Math.floor((Math.max(0, req.room(s)) + 1e-9) / step) * step;
	if (can < req.scale.min - 1e-9) return null;
	return Math.min(req.scale.base * str, can) / req.scale.base;
}
const reqAmount = (req, strength) => (req && req.scale ? req.scale.base : 1) * (Number.isFinite(strength) ? strength : 1);
const askText = (req, strength, bySpeaker, regime) => {
	if (!req) return "";
	let text = typeof req.ask === "function" ? req.ask(reqAmount(req, strength)) : req.ask;
	if (bySpeaker === "president" && req.from) {
		const institutionName = req.from === "central_bank" ? "ЦБ" : "Минфин";
		text = text.replace(/(?<!\p{L})нас(?!\p{L})/giu, institutionName).replace(/(?<!\p{L})нам(?!\p{L})/giu, institutionName);
	}
	if (bySpeaker === "president" && regime === "totalitarian") text = text.replace(/^(Просим|Требуем|Предлагаем) /, "Приказываем ");
	return text;
};
function requestOutcomeText(req, status, economyBefore, after) {
	if ((req.id === "rate_cut" || req.id === "rate_hike") && status !== "rejected") {
		const beforeRate = Number.isFinite(economyBefore.keyRate) ? economyBefore.keyRate : 0;
		const afterRate = Number.isFinite(after.keyRate) ? after.keyRate : beforeRate;
		const cut = afterRate < beforeRate - .01;
		const hike = afterRate > beforeRate + .01;
		if (req.id === "rate_cut") {
			if (cut) return status === "accepted" ? req.yes : req.partial;
			return hike ? `Центральный банк смягчает свою реакцию, но инфляция всё равно требует более высокой ставки — она растёт до ${rf2(afterRate)}%, просто меньше, чем без уступки.` : `Центральный банк идёт навстречу и отказывается от дальнейшего повышения, но снизить ставку пока не готов — она остаётся на ${rf2(afterRate)}%.`;
		}
		if (hike) return status === "accepted" ? req.yes : req.partial;
		return cut ? `Центральный банк ужесточает тон, но экономика требует смягчения — ставка всё равно снижается до ${rf2(afterRate)}%.` : `Центральный банк соглашается не смягчать политику дальше, но и на решительное повышение пока не идёт — ставка остаётся на ${rf2(afterRate)}%.`;
	}
	return status === "accepted" ? req.yes : status === "partial" ? req.partial : req.no;
}
const gdpLeverScale = (s) => Math.max(1, (s && s.nominalGdp ? s.nominalGdp : CONFIG.initial.gdp) / CONFIG.initial.gdp);
const TAX_DEMAND_CAP = {
	incomeTaxRate: 28,
	vatRate: 23
};
const TAX_KEYS = [
	"incomeTaxRate",
	"vatRate",
	"socialContribRate",
	"profitTaxRate",
	"exciseRate",
	"capitalTaxRate"
];
const taxSum = (d) => TAX_KEYS.reduce((a, k) => a + (Number.isFinite(d[k]) ? d[k] : 0), 0);
function taxCutPlan(d, total) {
	const out = {};
	TAX_KEYS.forEach((k) => {
		out[k] = d[k];
	});
	const start = CONFIG.initial;
	const pain = (k) => (TAX_DEMAND_CAP[k] && out[k] > TAX_DEMAND_CAP[k] ? 100 + out[k] - TAX_DEMAND_CAP[k] : 0) + (out[k] - (start[k] || 0)) / Math.max(5, start[k] || 5);
	for (let left = Math.round(total / .5); left > 0; left--) {
		const k = TAX_KEYS.filter((x) => Number.isFinite(out[x]) && out[x] >= .5).sort((a, b) => pain(b) - pain(a))[0];
		if (!k) break;
		out[k] = roundTo(out[k] - .5, .5);
	}
	return out;
}
const REQUESTS = [
	{
		id: "infra_up",
		from: "central_bank",
		label: "Нарастить госинвестиции",
		scale: {
			base: 1.5,
			min: .5,
			max: 3,
			step: .5,
			unit: "% ВВП"
		},
		ask: (n) => `Просим увеличить расходы на инфраструктуру на ${askNum(n)}% ВВП для поддержки совокупного спроса.`,
		fit: (s) => (s.outputGap < -1 ? 1.5 : s.outputGap > 1.5 ? -1.6 : .1) + (s.debtToGdp > 85 ? -.9 : .2),
		bias: {
			technocrat: .7,
			populist: .5,
			austerity: -.7
		},
		apply: (d, k) => ({ govInvestment: clamp(d.govInvestment + 1.5 * k, -15, 15) }),
		yes: "Минфин согласен: инфраструктурная программа будет расширена уже в этом квартале.",
		partial: "Минфин готов на половину запрошенного — бюджетное правило не позволяет больше.",
		no: "Минфин отказывает: наращивать расходы при нынешнем состоянии бюджета он не намерен."
	},
	{
		id: "deficit_cut",
		from: "central_bank",
		label: "Сократить дефицит бюджета",
		scale: {
			base: 1,
			min: .5,
			max: 2.5,
			step: .5,
			unit: "×"
		},
		ask: (n) => `Требуем притормозить рост расходов на ${askNum(2 * n)} п.п. и социальных выплат на ${askNum(1.5 * n)} п.п.: нынешний бюджетный импульс вынуждает нас держать ставку выше, чем требовалось бы.`,
		fit: (s) => (s.budgetBalancePctGdp < -4 ? 1.4 : .2) + (s.outputGap > 1 ? .8 : -.3) + (s.inflation > 6 ? .6 : 0),
		bias: {
			technocrat: .6,
			austerity: 1,
			populist: -.9
		},
		apply: (d, k) => ({
			govSpending: clampToLeverRange("govSpending", d.govSpending - 2 * k),
			transfers: clampToLeverRange("transfers", d.transfers - 1.5 * k)
		}),
		yes: "Минфин соглашается на консолидацию: расходы будут урезаны.",
		partial: "Минфин идёт на частичное сокращение, защитив социальные статьи.",
		no: "Минфин отвечает, что сокращать расходы в текущей ситуации политически невозможно."
	},
	{
		id: "transfers_freeze",
		from: "central_bank",
		label: "Заморозить рост социальных выплат",
		scale: {
			base: 1,
			min: .5,
			max: 2,
			step: .5,
			unit: " п.п."
		},
		ask: (n) => `Просим приостановить рост социальных выплат минимум на ${askNum(n)} п.п.: их рост напрямую транслируется в потребительский спрос и цены.`,
		fit: (s) => (s.inflation > 6 ? 1.3 : -.4) + (s.unemployment > 7 ? -1 : .3),
		bias: {
			austerity: 1,
			technocrat: .3,
			populist: -1.4
		},
		apply: (d, k) => ({ transfers: clampToLeverRange("transfers", Math.min(d.transfers, 0) - 1 * k) }),
		yes: "Минфин замораживает индексацию выплат до нормализации инфляции.",
		partial: "Минфин ограничивает рост выплат, но полной заморозки не допускает.",
		no: "Минфин отвечает, что заморозка выплат при текущем положении людей исключена."
	},
	{
		id: "tax_cut",
		from: "central_bank",
		label: "Снизить налоги",
		scale: {
			base: 2,
			min: 1,
			max: 5,
			step: .5,
			unit: " п.п."
		},
		ask: (n) => `Просим снизить налоговую нагрузку — в сумме на ${askNum(n)} п.п. ставок и не повышать их полтора года. Какие налоги снижать, решает Минфин.`,
		fit: (s) => (s.incomeTaxRate > TAX_DEMAND_CAP.incomeTaxRate || s.vatRate > TAX_DEMAND_CAP.vatRate ? 1.2 : -.3) + (s.budgetBalancePctGdp > -3 ? .4 : s.budgetBalancePctGdp < -6 ? -1 : -.4) + (s.outputGap < -1 ? .3 : 0),
		bias: {
			technocrat: .2,
			austerity: -.6,
			populist: .9
		},
		apply: (d, k) => taxCutPlan(d, 2 * k),
		progress: (base, fin, str) => clamp((taxSum(base) - taxSum(fin)) / Math.max(.5, roundTo(2 * (str || 1), .5)), 0, 1),
		yes: "Минфин снижает налоги и обещает не поднимать их полтора года.",
		partial: "Минфин снижает налоги вдвое меньше запрошенного — и тоже обещает их не поднимать.",
		no: "Минфин отказывается: выпадающие доходы бюджета нечем закрыть."
	},
	{
		id: "tax_relief_business",
		retired: true,
		from: "central_bank",
		label: "Снизить налог на прибыль",
		scale: {
			base: 2,
			min: .5,
			max: 4,
			step: .5,
			unit: " п.п."
		},
		ask: (n) => `Предлагаем снизить налог на прибыль на ${askNum(n)} п.п.: инвестиции сдерживаются и стоимостью денег, и налоговой нагрузкой сразу.`,
		fit: (s) => (s.investmentGrowth < 0 ? 1.2 : 0) + (s.budgetBalancePctGdp > -3 ? .5 : -.9),
		bias: {
			technocrat: .4,
			austerity: .2,
			populist: -.8
		},
		apply: (d, k) => ({ profitTaxRate: clamp(d.profitTaxRate - 2 * k, 0, 45) }),
		yes: "Минфин снижает налог на прибыль, рассчитывая вернуть выпадающие доходы ростом базы.",
		partial: "Минфин идёт на символическое снижение ставки.",
		no: "Минфин отказывается: выпадающие доходы нечем закрыть."
	},
	{
		id: "vat_relief",
		retired: true,
		from: "central_bank",
		label: "Снизить НДС",
		scale: {
			base: 1.5,
			min: .5,
			max: 3,
			step: .5,
			unit: " п.п."
		},
		ask: (n) => `Просим снизить НДС на ${askNum(n)} п.п.: налоговая нагрузка бьёт по спросу населения раньше, чем по цифрам роста.`,
		fit: (s) => (s.vatRate > 20 ? 1.3 : -.5) + (s.budgetBalancePctGdp > -3 ? .4 : -1),
		bias: {
			technocrat: .1,
			austerity: -.7,
			populist: .9
		},
		apply: (d, k) => ({ vatRate: clamp(d.vatRate - 1.5 * k, 0, 30) }),
		yes: "Минфин снижает НДС, рассчитывая компенсировать выпадающие доходы ростом потребления.",
		partial: "Минфин идёт на символическое снижение НДС.",
		no: "Минфин отказывается: выпадающие доходы бюджета нечем закрыть."
	},
	{
		id: "fiscal_hold",
		from: "central_bank",
		label: "Не наращивать бюджетный импульс",
		hold: [
			{
				key: "govSpending",
				dir: 1
			},
			{
				key: "transfers",
				dir: 1
			},
			{
				key: "govInvestment",
				dir: 1
			}
		],
		ask: "Просим не расширять бюджетный импульс дальше: дополнительное стимулирование сейчас разгонит инфляцию и вынудит нас держать ставку выше.",
		fit: (s) => (s.inflation > s.inflationTarget + 1.5 ? 1.2 : -.4) + (s.outputGap > 1 ? .8 : -.2) + (s.debtToGdp > 80 ? .3 : 0),
		bias: {
			technocrat: .5,
			austerity: .9,
			populist: -1
		},
		apply: (d, k) => ({
			govSpending: d.govSpending > 0 ? roundTo(d.govSpending * (1 - k), .5) : d.govSpending,
			transfers: d.transfers > 0 ? roundTo(d.transfers * (1 - k), .5) : d.transfers,
			govInvestment: d.govInvestment > 0 ? roundTo(d.govInvestment * (1 - k), .5) : d.govInvestment
		}),
		yes: "Минфин соглашается не расширять бюджетный импульс дальше.",
		partial: "Минфин частично сдерживает рост расходов, но не отказывается от него полностью.",
		no: "Минфин отвечает, что взятые бюджетные обязательства снижать не намерен."
	},
	{
		id: "defense_up",
		from: "central_bank",
		presidentOnly: true,
		label: "Нарастить военные расходы",
		scale: {
			base: 3,
			min: 1,
			max: 6,
			step: 1,
			unit: " п.п. бюджета"
		},
		ask: (n) => `Просим увеличить долю военных расходов в бюджете на ${askNum(n)} п.п.: недофинансированная оборона в нынешней обстановке — риск дороже, чем строчка в бюджете.`,
		fit: (s) => ((s.warQuartersLeft || 0) > 0 ? 1.5 : -.9) + (s.debtToGdp > 85 ? -.5 : .2),
		bias: {
			technocrat: -.1,
			austerity: -.4,
			populist: .1
		},
		apply: (d, k) => ({ shareDefense: clamp(d.shareDefense + 3 * k, 2, 40) }),
		yes: "Минфин соглашается нарастить долю военных расходов за счёт остальных статей и держать её два года.",
		partial: "Минфин идёт на скромное увеличение военной доли бюджета.",
		no: "Минфин отказывает: перекраивать бюджет в пользу обороны сейчас не готовы."
	},
	{
		id: "rate_cut",
		from: "ministry_finance",
		label: "Снизить ключевую ставку",
		scale: {
			base: 1,
			min: .25,
			max: 2.5,
			step: .25,
			unit: " п.п."
		},
		ask: (n) => `Просим снизить ключевую ставку на ${askNum(n)} п.п.: стоимость кредита душит инвестиции и обслуживание долга.`,
		room: (s) => Number.isFinite(s.keyRate) ? s.keyRate : 0,
		fit: (s) => (s.outputGap < -1 ? 1.3 : -.6) + (s.inflation < s.inflationTarget + 1 ? .9 : -1.4) + (s.unemployment > 7 ? .6 : 0),
		bias: {
			dove: .9,
			pragmatic: .2,
			hawk: -.9
		},
		apply: (d, k, economy) => ({ keyRate: k <= 0 ? d.keyRate : clamp(Math.min(roundTo(d.keyRate - 1 * k, .25), roundTo(d.keyRate, .25) - .25), 0, keyRateCap(economy)) }),
		yes: "Центральный банк соглашается и снижает ставку — инфляционная картина это позволяет.",
		partial: "Центральный банк снижает ставку вдвое меньше запрошенного.",
		no: "Центральный банк отказывает: снижение ставки при текущей инфляции стоило бы доверия к цели."
	},
	{
		id: "rate_hike",
		from: "ministry_finance",
		label: "Решительно подавить инфляцию",
		scale: {
			base: 2,
			min: .5,
			max: 4,
			step: .5,
			unit: " п.п."
		},
		ask: (n) => `Требуем повысить ключевую ставку на ${askNum(n)} п.п.: рост цен обесценивает доходы и расходы быстрее, чем их успевают индексировать.`,
		room: (s) => keyRateCap(s) - (Number.isFinite(s.keyRate) ? s.keyRate : 0),
		fit: (s) => (s.inflation > s.inflationTarget + 2 ? 1.4 : -1) + (s.inflationExpectations > s.inflationTarget + 1.5 ? .7 : -.3) + (s.outputGap < -2 ? -.8 : .2),
		bias: {
			hawk: .9,
			pragmatic: .2,
			dove: -.9
		},
		apply: (d, k, economy) => ({ keyRate: k <= 0 ? d.keyRate : clamp(Math.max(roundTo(d.keyRate + 2 * k, .25), roundTo(d.keyRate, .25) + .25), 0, keyRateCap(economy)) }),
		yes: "Центральный банк соглашается и повышает ставку решительнее, чем планировал.",
		partial: "Центральный банк добавляет к своему решению половину запрошенного шага.",
		no: "Центральный банк отказывает: он считает, что уже сделал достаточно, а переужесточение обойдётся выпуском."
	},
	{
		id: "rate_hold",
		from: "ministry_finance",
		label: "Не повышать ставку",
		hold: [{
			key: "keyRate",
			dir: 1
		}],
		ask: "Просим воздержаться от повышения ставки: бюджет и без того несёт растущие процентные расходы.",
		fit: (s) => (s.inflation < s.inflationTarget + 2 ? .9 : -1.5) + (s.interestToRevenue > 14 ? .8 : 0),
		bias: {
			dove: .8,
			pragmatic: .1,
			hawk: -1
		},
		apply: (d, k, economy) => {
			const hike = d.keyRate - economy.keyRate;
			return hike <= 0 ? { keyRate: d.keyRate } : { keyRate: roundTo(economy.keyRate + hike * (1 - k), .25) };
		},
		yes: "Центральный банк берёт паузу в ужесточении.",
		partial: "Центральный банк обещает действовать осторожнее, но связывать себе руки не готов.",
		no: "Центральный банк отвечает, что независимость политики не обсуждается."
	},
	{
		id: "liquidity_help",
		from: "ministry_finance",
		label: "Поддержать ликвидность банков",
		scale: {
			base: 1,
			min: .5,
			max: 2.5,
			step: .5,
			unit: "×"
		},
		ask: (n) => `Просим предоставить банковской системе поддержку объёмом не менее ${askNum(n)}× обычного пакета ликвидности: кредитование останавливается, страдают предприятия.`,
		fit: (s) => (s.bankLiquidity < 60 ? 1.4 : -.3) + (s.creditCrunch ? 1 : 0) + (s.inflation > 8 ? -.7 : .2),
		bias: {
			dove: .6,
			pragmatic: .5,
			hawk: .1
		},
		apply: (d, k, economy) => ({ liquidity: clamp(d.liquidity + 12 * k * gdpLeverScale(economy), -100 * gdpLeverScale(economy), 200 * gdpLeverScale(economy)) }),
		yes: "Центральный банк открывает окно ликвидности для банков.",
		partial: "Центральный банк предоставляет ограниченный объём ликвидности.",
		no: "Центральный банк считает поддержку преждевременной."
	},
	{
		id: "capreq_ease",
		from: "ministry_finance",
		label: "Смягчить норматив капитала",
		scale: {
			base: 1,
			min: .5,
			max: 2,
			step: .5,
			unit: " п.п."
		},
		ask: (n) => `Просим временно смягчить требование к капиталу банков минимум на ${askNum(n)} п.п., чтобы разблокировать кредитование экономики.`,
		fit: (s) => (s.creditCrunch ? 1.5 : -.5) + (s.creditGap > 5 ? -1.2 : .3) + (s.bankNPL > 8 ? -.8 : 0),
		bias: {
			dove: .5,
			pragmatic: .1,
			hawk: -.8
		},
		apply: (d, k) => ({ capitalRequirement: clamp(d.capitalRequirement - 1 * k, 8, 18) }),
		yes: "Центральный банк временно снижает норматив, признавая остроту кредитного сжатия.",
		partial: "Центральный банк идёт на минимальное послабление.",
		no: "Центральный банк отказывает: ослабление норматива в такой момент готовит следующий кризис."
	},
	{
		id: "fx_support",
		from: "ministry_finance",
		label: "Поддержать курс интервенциями",
		scale: {
			base: 1,
			min: .5,
			max: 2.5,
			step: .5,
			unit: "×"
		},
		ask: (n) => `Просим выйти на валютный рынок и продавать резервы объёмом не менее ${askNum(n)}× обычной интервенции (сдвиньте валютные интервенции в минус): ослабление курса разгоняет цены и стоимость импорта для бюджета.`,
		fit: (s) => (s.fxDeprAnnual > 6 ? 1.3 : -.6) + (s.reserves > 200 ? .5 : -1),
		bias: {
			hawk: .5,
			pragmatic: .3,
			dove: 0
		},
		apply: (d, k, economy) => ({ fxIntervention: clamp(d.fxIntervention - 12 * k * gdpLeverScale(economy), -400 * gdpLeverScale(economy), 400 * gdpLeverScale(economy)) }),
		yes: "Центральный банк выходит на рынок в поддержку курса.",
		partial: "Центральный банк проводит ограниченные интервенции.",
		no: "Центральный банк отвечает, что тратить резервы против фундаментальных факторов бессмысленно."
	}
];
// src/lib/politics/president.js
const REFORM_RAMP = {
	labor: 8,
	pension: 12,
	courts: 10,
	deregulation: 6,
	education: 16
};
const reformShare = (reforms, id) => clamp((reforms && reforms[id] || 0) / (REFORM_RAMP[id] || 8), 0, 1);
function reformEffects(reforms) {
	return {
		nairu: -1.5 * reformShare(reforms, "labor"),
		humanCapital: 7 * reformShare(reforms, "education"),
		riskPremium: -.4 * reformShare(reforms, "courts"),
		transfers: -.8 * reformShare(reforms, "pension")
	};
}
const pressControlled = (e) => e.politicalRegime === "authoritarian" || e.politicalRegime === "totalitarian";
function publicNews(spec, e) {
	if (!spec || !pressControlled(e)) return spec;
	const out = { ...spec };
	if (spec.textHard) out.text = spec.textHard;
	if (spec.headlineHard) out.headline = spec.headlineHard;
	return out;
}
const PRESIDENT_ACTIONS = [
	{
		id: "address",
		group: "public",
		label: "Обращение к нации",
		cost: 8,
		cooldown: 3,
		desc: "Прямой эфир поверх всех ведомств. Работает тем хуже, чем сильнее слова расходятся с ценами в магазине и с безработицей: рейтинг покупается доверием, а доверие — единственное, что нельзя напечатать.",
		build: (s, difficulty) => {
			const believe = clamp(1 - Math.max(0, s.inflation - s.inflationTarget) / 12 - Math.max(0, s.unemployment - s.nairu) / 10, .2, 1);
			const room = 1 - clamp((s.approval - 50) / 45, 0, .7);
			return {
				impulses: [makeImpulse("approvalPush", 6.5 * believe * room, "Обращение президента к нации", "fast", difficulty, "other"), makeImpulse("consumerConfidence", 2.4 * believe, "Обращение президента к нации", "default", difficulty, "other")],
				news: {
					cat: "gov",
					headline: "ПРЕЗИДЕНТ ОБРАЩАЕТСЯ К НАЦИИ",
					text: `Прямое обращение поверх ведомств: президент объясняет курс своими словами при инфляции ${fmt1(s.inflation)}% и безработице ${fmt1(s.unemployment)}%. Доверие к сказанному — ${Math.round(believe * 100)} из 100: разговор стоит ровно столько, сколько стоят цифры за ним.`,
					priority: 6
				}
			};
		}
	},
	{
		id: "elite_deal",
		group: "public",
		label: "Договориться с элитами",
		cost: 16,
		cooldown: 6,
		desc: "Закрытые переговоры с теми, кто реально распоряжается активами. Снимает политическое напряжение и возвращает бизнесу уверенность — ценой доверия тех, кто узнаёт о сделке из новостей.",
		build: (s, difficulty) => ({
			impulses: [
				makeImpulse("tensionPush", -11, "Соглашение с элитами", "fast", difficulty, "other"),
				makeImpulse("businessConfidence", 6, "Соглашение с элитами", "default", difficulty, "other"),
				makeImpulse("govTrust", -3.5, "Закулисная сделка стала известна", "default", difficulty, "other"),
				makeImpulse("approvalPush", -2.5, "Закулисная сделка стала известна", "fast", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "ЗАКРЫТАЯ ВСТРЕЧА ПРЕЗИДЕНТА С КРУПНЫМ БИЗНЕСОМ",
				text: `Итогов не публикуют, но напряжение в верхах спало, а бизнес заговорил о предсказуемости. Напряжённость была ${Math.round(s.politicalTension || 0)} из 100 — цена вопроса в том, что об условиях сделки страна узнаёт последней.`,
				priority: 6
			}
		})
	},
	{
		id: "anticorruption",
		group: "public",
		label: "Антикоррупционная кампания",
		cost: 24,
		cooldown: 12,
		desc: "Громкие дела и проверки. Через год-полтора это лучшая инвестиция в доверие и производительность, какая есть у президента, — но сначала бизнес замирает, а элиты, по которым идёт кампания, переходят в оппозицию.",
		build: (s, difficulty) => ({
			impulses: [
				sustainedImpulse("govTrust", 1.3, 8, "Антикоррупционная кампания", "other"),
				makeImpulse("approvalPush", 4.5, "Антикоррупционная кампания", "fast", difficulty, "other"),
				sustainedImpulse("productivity", .13, 8, "Антикоррупционная кампания: меньше издержек на «решение вопросов»"),
				makeImpulse("investment", -1.1, "Проверки: бизнес откладывает решения", "default", difficulty),
				makeImpulse("tensionPush", 6, "Элиты под ударом кампании", "fast", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "ПРЕЗИДЕНТ ОБЪЯВЛЯЕТ АНТИКОРРУПЦИОННУЮ КАМПАНИЮ",
				text: "Проверки в госкорпорациях и первые задержания. Улица одобряет, инвесторы берут паузу, а те, по кому идёт кампания, впервые за долгое время объединяются против власти.",
				textHard: "Проверки в госкорпорациях и первые задержания. Ведётся планомерная работа по очищению государственного аппарата; граждане поддерживают решительность руководства. Отдельные хозяйственные структуры временно приостановили инвестиционные программы.",
				priority: 8,
				chain: [
					"Кампания объявлена",
					"Бизнес выжидает",
					"Элиты в оппозиции",
					"Доверие ↑",
					"Производительность ↑"
				]
			}
		})
	},
	{
		id: "crackdown",
		group: "public",
		label: "Силовое подавление протеста",
		cost: 14,
		cooldown: 4,
		requires: (s) => s.unrestActive || (s.politicalTension || 0) >= 45,
		reqText: "Доступно при беспорядках или напряжённости от 45",
		desc: "Улицу можно очистить за один квартал. Напряжение не исчезает — оно уходит внутрь и возвращается больше, чем было, а капитал и доверие уходят сразу и насовсем.",
		build: (s, difficulty) => ({
			impulses: [
				makeImpulse("tensionPush", -17, "Протест подавлен силой", "fast", difficulty, "other"),
				sustainedImpulse("tensionPush", 2.6, 6, "Подавление копит напряжение вглубь", "other"),
				makeImpulse("govTrust", -8, "Силовой разгон протеста", "default", difficulty, "other"),
				makeImpulse("businessConfidence", -6, "Силовой разгон протеста", "default", difficulty, "other"),
				makeImpulse("capitalFlow", -10, "Отток капитала после силового сценария", "default", difficulty)
			],
			news: {
				cat: "crisis",
				headline: "ПЛОЩАДИ ОЧИЩЕНЫ: ВЛАСТЬ ВЫБРАЛА СИЛОВОЙ СЦЕНАРИЙ",
				text: "Официально — «восстановление порядка». Улицы пусты, но опросы фиксируют не согласие, а страх: подавленное напряжение возвращается позже и сильнее.",
				headlineHard: "ПОРЯДОК В СТОЛИЦЕ ПОЛНОСТЬЮ ВОССТАНОВЛЕН",
				textHard: "Попытка дестабилизации пресечена, работа городских служб не прерывалась. Ведомства отмечают спокойствие и сознательность граждан; отдельные участники беспорядков устанавливаются.",
				priority: 9,
				chain: [
					"Протест",
					"Разгон",
					"Тишина сейчас",
					"Напряжение вглубь",
					"Отток капитала"
				]
			}
		})
	},
	{
		id: "military_parade",
		group: "public",
		label: "Военный парад",
		cost: 10,
		cooldown: 5,
		desc: "Демонстрация силы без единого выстрела: техника на площади, войска в строю, трансляция на всю страну. Рейтинг растёт от одного зрелища — заметно сильнее, если стране есть чем гордиться прямо сейчас (идёт война), и слабее, а то и в минус, если экономика тем временем явно страдает: тогда парад читается не как повод для гордости, а как отвлечение внимания.",
		build: (s, difficulty) => {
			const struggling = s.unemployment - s.nairu > 1.5 || s.inflation > s.inflationTarget + 3;
			const atWar = (s.warQuartersLeft || 0) > 0;
			return {
				impulses: [makeImpulse("approvalPush", (atWar ? 5.5 : 3.2) * (struggling ? .4 : 1) - (struggling ? 1.6 : 0), "Военный парад", "fast", difficulty, "other"), makeImpulse("tensionPush", struggling ? 3 : -1.5, "Военный парад", "fast", difficulty, "other")],
				news: {
					cat: "gov",
					headline: "ВОЕННЫЙ ПАРАД В СТОЛИЦЕ",
					text: `Техника и войска перед трибунами, трансляция идёт весь день. ${atWar ? "На фоне идущей войны зрелище работает: есть, чем гордиться прямо сейчас." : struggling ? `При безработице ${fmt1(s.unemployment)}% и инфляции ${fmt1(s.inflation)}% зрелище многие читают не как повод для гордости, а как отвлечение от повседневных проблем.` : "В мирное время это чистая демонстрация силы, которую пока не пришлось применять."}`,
					priority: 6
				}
			};
		}
	},
	{
		id: "sanctions_impose",
		group: "diplomacy",
		label: "Ввести санкции против торгового партнёра",
		cost: 20,
		cooldown: 12,
		requires: (s) => (s.warQuartersLeft || 0) <= 0,
		reqText: "Недоступно во время войны — экономическое давление теряет смысл рядом с настоящей",
		desc: "Ограничить торговлю и инвестиции с одной из стран-партнёров — экономическое давление вместо военного. Рейтинг греется сплочением почти сразу, но подорожавший импорт и осторожность инвесторов остаются на годы.",
		build: (s, difficulty) => ({
			patch: { sanctionsStart: true },
			impulses: [
				makeImpulse("approvalPush", 3.5, "Санкции против торгового партнёра", "fast", difficulty, "other"),
				makeImpulse("tensionPush", -2, "Внешний оппонент сплачивает вокруг власти", "fast", difficulty, "other"),
				sustainedImpulse("inflationSupply", .35, 10, "Санкции: подорожавший импорт", "other"),
				sustainedImpulse("businessConfidence", -.6, 10, "Санкции: торговые ограничения"),
				sustainedImpulse("investment", -.5, 10, "Санкции: инвесторы закладывают риск ограничений"),
				makeImpulse("riskPremium", .25, "Санкции повышают премию за риск", "default", difficulty)
			],
			news: {
				cat: "gov",
				headline: "ПРЕЗИДЕНТ ВВОДИТ САНКЦИИ ПРОТИВ ТОРГОВОГО ПАРТНЁРА",
				text: "Ограничения на торговлю и инвестиции с одной из стран-партнёров. Внутри это читают как решительность, снаружи — как разрыв связей, который бьёт по импорту и инвестициям на годы вперёд.",
				priority: 8,
				chain: [
					"Санкции объявлены",
					"Рейтинг ↑ сразу",
					"Импорт дороже",
					"Инвестиции ↓",
					"Премия за риск ↑"
				]
			}
		})
	},
	{
		id: "trade_bloc",
		group: "diplomacy",
		label: "Вступить в торговый блок",
		cost: 30,
		cooldown: 60,
		requires: (s) => (s.warQuartersLeft || 0) <= 0,
		reqText: "Недоступно во время войны",
		desc: "Договориться о едином рынке с соседями: ниже барьеры для торговли, дешевле капитал, ниже премия за риск — но часть регуляторных решений придётся согласовывать, а не принимать в одиночку. Долгий эффект, почти не отменяется.",
		build: (s, difficulty) => ({
			patch: { tradeBlocJoin: true },
			impulses: [
				sustainedImpulse("investment", .7, 16, "Членство в торговом блоке", "other"),
				sustainedImpulse("businessConfidence", .9, 16, "Членство в торговом блоке", "other"),
				makeImpulse("riskPremium", -.4, "Торговый блок снижает премию за риск", "default", difficulty),
				makeImpulse("tensionPush", 5, "Часть решений теперь согласуется с блоком, а не только внутри страны", "fast", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "СТРАНА ВСТУПАЕТ В ТОРГОВЫЙ БЛОК",
				text: "Соглашение снимает барьеры для торговли и капитала с партнёрами по блоку. Издержки бизнеса падают вместе с премией за риск — а часть регуляторных решений теперь придётся согласовывать, а не принимать в одиночку.",
				priority: 8,
				chain: [
					"Соглашение подписано",
					"Барьеры ↓",
					"Капитал дешевле",
					"Согласование с блоком",
					"Напряжение ↑"
				]
			}
		})
	},
	{
		id: "dissolve",
		group: "power",
		severe: true,
		label: "Распустить парламент",
		cost: 45,
		cooldown: 14,
		requires: (s) => !s.parliamentDissolved,
		reqText: "Доступно, пока парламент работает",
		desc: "Убрать единственный орган, способный сказать «нет». Решения перестают тормозиться — вместе с ними перестаёт работать всё, что держало премию за риск низкой.",
		build: (s, difficulty) => ({
			patch: { dissolve: true },
			impulses: [
				makeImpulse("tensionPush", 22, "Роспуск парламента указом президента", "fast", difficulty, "other"),
				makeImpulse("businessConfidence", -11, "Роспуск парламента: институты слабеют", "default", difficulty, "other"),
				makeImpulse("riskPremium", .55, "Роспуск парламента", "default", difficulty),
				makeImpulse("capitalFlow", -14, "Бегство капитала после роспуска парламента", "default", difficulty),
				makeImpulse("approvalPush", -5, "Роспуск парламента", "fast", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "УКАЗ ПРЕЗИДЕНТА: ПАРЛАМЕНТ РАСПУЩЕН",
				text: "Формулировка указа — «временная мера ради управляемости». Ни срока, ни даты новых выборов в тексте нет.",
				priority: 10,
				chain: [
					"Указ президента",
					"Парламент распущен",
					"Институты слабеют",
					"Премия за риск ↑"
				]
			}
		})
	},
	{
		id: "restore_parliament",
		group: "power",
		label: "Вернуть парламент",
		cost: 32,
		cooldown: 8,
		requires: (s) => !!s.parliamentDissolved,
		reqText: "Доступно, только если парламент распущен",
		desc: "Добровольно вернуть себе ограничение. Самый дорогой способ снять напряжение и единственная дорога обратно из авторитарного режима, если идти по ней сознательно, а не под давлением улицы.",
		build: (s, difficulty) => ({
			patch: { restore: true },
			impulses: [
				makeImpulse("tensionPush", -19, "Парламент возвращён указом президента", "fast", difficulty, "other"),
				makeImpulse("businessConfidence", 9, "Возврат к парламентской процедуре", "default", difficulty, "other"),
				makeImpulse("riskPremium", -.35, "Восстановление институтов", "default", difficulty),
				sustainedImpulse("govTrust", 1, 6, "Возврат к парламентской процедуре", "other")
			],
			news: {
				cat: "gov",
				headline: "ПРЕЗИДЕНТ ВОЗВРАЩАЕТ ПОЛНОМОЧИЯ ПАРЛАМЕНТУ",
				text: "Указ отменён тем же, кто его подписал. Оппозиция называет это вынужденным шагом, рынки — первым за долгое время сигналом, что правила ещё что-то значат.",
				textHard: "Работа представительного органа возобновляется по решению главы государства. Руководство подчёркивает: мера принята в плановом порядке, поскольку обстоятельства, потребовавшие особого управления, исчерпаны.",
				priority: 9,
				chain: [
					"Указ отменён",
					"Парламент работает",
					"Напряжение ↓",
					"Премия за риск ↓"
				]
			}
		})
	},
	{
		id: "war_start",
		group: "war",
		severe: true,
		label: "Начать военную операцию",
		cost: 45,
		cooldown: 20,
		requires: (s) => (s.warQuartersLeft || 0) <= 0,
		reqText: "Доступно, пока страна не воюет",
		desc: "Собственная война вместо чужой. Первые кварталы рейтинг растёт на сплочении вокруг флага, а с ним открываются чрезвычайные полномочия. Дальше начинается счёт: санкции, бегство капитала, сжатие торговли и инвестиций, рост цен со стороны предложения. Из войны выходят не тогда, когда захотят, а когда смогут.",
		build: (s, difficulty) => {
			const authoritarianPress = s.politicalRegime === "authoritarian" || s.politicalRegime === "totalitarian";
			return {
				patch: { startWar: true },
				impulses: [
					taperedImpulse("approvalPush", [
						11,
						7,
						4,
						2,
						1
					], "Сплочение вокруг флага", "other"),
					sustainedImpulse("approvalPush", -1.8, 9, "Война затягивается", "other"),
					makeImpulse("tensionPush", 10, "Начало военной операции", "fast", difficulty, "other"),
					makeImpulse("exportsGrowth", -7, "Санкции против наступающей стороны", "default", difficulty),
					makeImpulse("importsGrowth", -6, "Закрытие торговых каналов", "default", difficulty),
					makeImpulse("capitalFlow", -26, "Бегство капитала из воюющей страны", "default", difficulty),
					makeImpulse("fdi", -18, "Прямые инвестиции сворачиваются", "default", difficulty),
					makeImpulse("riskPremium", 1.2, "Военная премия за риск", "default", difficulty),
					makeImpulse("businessConfidence", -15, "Война: бизнес не планирует", "default", difficulty, "other"),
					makeImpulse("inflationSupply", 1.4, "Разрыв поставок и военный спрос", "default", difficulty),
					makeImpulse("stockShock", -16, "Рынок переоценивает риск войны", "fast", difficulty),
					sustainedImpulse("potentialShock", -.35, 10, "Люди и мощности уходят на войну")
				],
				news: {
					cat: "gov",
					headline: "ПРЕЗИДЕНТ ОБЪЯВЛЯЕТ О НАЧАЛЕ ВОЕННОЙ ОПЕРАЦИИ",
					text: authoritarianPress ? "Официальное сообщение: решение принято ради безопасности и будущего страны, альтернативы ему не было. Народ сплотился вокруг руководства, армия выполняет поставленную задачу. Попытки внешних сил давить санкциями обречены на провал и лишь ускорят опору на собственные силы." : `Решение объявлено как вынужденное и единственно возможное. Рейтинг власти ${Math.round(s.approval)} из 100 в ближайшие кварталы вырастет — так бывает всегда в первые месяцы. Партнёры уже готовят ограничения: экспорт, импорт, капитал и прямые инвестиции пойдут вниз одновременно.`,
					priority: 10,
					chain: [
						"Решение президента",
						"Сплочение вокруг флага",
						"Санкции",
						"Торговля ↓",
						"Капитал ↓",
						"Цены ↑"
					]
				}
			};
		}
	},
	{
		id: "mobilization",
		group: "war",
		severe: true,
		label: "Объявить мобилизацию",
		cost: 28,
		cooldown: 8,
		requires: (s) => (s.warQuartersLeft || 0) > 0,
		reqText: "Доступно только во время войны",
		desc: "Забрать людей из экономики в армию. Безработица падает — но не потому, что появились рабочие места; выпуск и потенциал падают вместе с ней. Рейтинг платит сразу и заметно: мобилизация касается каждой семьи, в отличие от войны на экране.",
		build: (s, difficulty) => ({
			patch: { warExtend: 2 },
			impulses: [
				makeImpulse("approvalPush", -13, "Мобилизация коснулась каждой семьи", "fast", difficulty, "other"),
				makeImpulse("tensionPush", 16, "Мобилизация", "fast", difficulty, "other"),
				sustainedImpulse("potentialShock", -.55, 8, "Люди изъяты из экономики"),
				makeImpulse("consumption", -1.6, "Отъезд работников и неопределённость", "default", difficulty),
				makeImpulse("capitalFlow", -14, "Отъезд капитала вслед за людьми", "default", difficulty),
				makeImpulse("businessConfidence", -9, "Мобилизация: кадры выбывают", "default", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "ОБЪЯВЛЕНА МОБИЛИЗАЦИЯ",
				text: `Призыв затрагивает всю страну. Формально безработица снизится — из экономики просто изымают людей; выпуск, потенциал и потребление уйдут вниз следом. Напряжённость была ${Math.round(s.politicalTension || 0)} из 100, и это решение её не уменьшит.`,
				priority: 10,
				chain: [
					"Мобилизация",
					"Рабочих рук ↓",
					"Потенциал ↓",
					"Рейтинг ↓",
					"Напряжённость ↑"
				]
			}
		})
	},
	{
		id: "war_economy",
		group: "war",
		severe: true,
		label: "Перевести экономику на военные рельсы",
		cost: 34,
		cooldown: 12,
		requires: (s) => (s.warQuartersLeft || 0) > 0,
		reqText: "Доступно только во время войны",
		desc: "Госзаказ вместо рынка: оборонная промышленность растёт, гражданский сектор сжимается. Выпуск и занятость держатся, но держатся на бюджете — и всё, что произведено, не становится ни потреблением, ни будущим ростом.",
		build: (s, difficulty) => ({
			impulses: [
				sustainedImpulse("govInvestmentPush", 3, 8, "Военный заказ"),
				makeImpulse("secIndustry", 12, "Оборонная промышленность на подъёме", "fast", difficulty),
				makeImpulse("secConsumer", -10, "Гражданский сектор сжимается", "fast", difficulty),
				makeImpulse("inflationSupply", .8, "Военный заказ вытесняет гражданское производство", "default", difficulty),
				sustainedImpulse("productivity", -.08, 8, "Производство не по спросу, а по разнарядке")
			],
			news: {
				cat: "gov",
				headline: "ЭКОНОМИКА ПЕРЕВЕДЕНА НА ВОЕННЫЕ РЕЛЬСЫ",
				text: "Госзаказ становится главным покупателем: оборонные заводы работают в три смены, гражданские линии останавливаются. Цифры выпуска это поддержит — благосостояние нет: произведённое не съесть, не надеть и не вложить в завтрашний рост.",
				priority: 9,
				chain: [
					"Военный заказ",
					"Оборонка ↑",
					"Гражданский сектор ↓",
					"Производительность ↓"
				]
			}
		})
	},
	{
		id: "peace_deal",
		group: "war",
		severe: true,
		label: (s) => s.warType === "defensive" ? "Капитулировать" : "Заключить мир",
		cost: 24,
		cooldown: 6,
		requires: (s) => (s.warQuartersLeft || 0) > 0 && s.warType !== "revanche",
		reqText: "Доступно только во время войны",
		desc: (s) => s.warType === "defensive" ? "Остановить войну на условиях противника, потому что обороняться дальше нечем. Это не переговоры на равных: часть требований будет выполнена, санкции снимутся не полностью, а внутри страны решение читается как поражение, а не как облегчение. Экономика перестаёт терять с этого квартала — но не возвращает то, что уже потеряно." : "Выйти из войны раньше, чем она закончится сама. Санкции снимаются медленнее, чем вводились, а внутри решение читается как признание поражения — но экономика начинает восстанавливаться с этого квартала, а не через год.",
		build: (s, difficulty) => {
			const authoritarianPress = s.politicalRegime === "authoritarian" || s.politicalRegime === "totalitarian";
			if (s.warType === "defensive") return {
				patch: { endWar: true },
				impulses: [
					makeImpulse("approvalPush", -18, "Капитуляция читается как поражение", "fast", difficulty, "other"),
					makeImpulse("tensionPush", 12, "Капитуляция раскалывает общество", "fast", difficulty, "other"),
					makeImpulse("businessConfidence", 5, "Боевые действия прекращены, но условия невыгодны", "default", difficulty, "other"),
					makeImpulse("capitalFlow", 5, "Капитал возвращается осторожно", "default", difficulty),
					makeImpulse("riskPremium", .5, "Уступки повышают премию за риск на будущее", "default", difficulty),
					makeImpulse("stockShock", -12, "Рынок закладывает цену капитуляции", "fast", difficulty),
					sustainedImpulse("potentialShock", -.4, 6, "Утрата территорий и производственных мощностей"),
					sustainedImpulse("exportsGrowth", -.8, 4, "Торговые маршруты достались победителю")
				],
				news: {
					cat: "gov",
					headline: authoritarianPress ? "БОЕВЫЕ ДЕЙСТВИЯ ОСТАНОВЛЕНЫ" : "ПРЕЗИДЕНТ ОБЪЯВЛЯЕТ О КАПИТУЛЯЦИИ",
					text: authoritarianPress ? "Официальное сообщение: руководство остановило боевые действия ради сохранения жизней и стабильности страны. Условия соглашения не разглашаются полностью; независимые источники называют их уступками стороне, начавшей конфликт." : "Глава государства принимает условия противника, чтобы остановить боевые действия. Это не мирный договор равных сторон, а признание невозможности обороняться дальше: часть требований противника выполнена, потери территорий и репараций фиксируются соглашением. Рынок и общество читают это как поражение, а не как облегчение.",
					priority: 10,
					chain: [
						"Капитуляция",
						"Потери территорий",
						"Премия за риск ↑",
						"Рейтинг ↓↓"
					]
				}
			};
			return {
				patch: { endWar: true },
				impulses: [
					makeImpulse("approvalPush", -6, "Мир читается как поражение", "fast", difficulty, "other"),
					makeImpulse("tensionPush", -8, "Война окончена", "fast", difficulty, "other"),
					makeImpulse("businessConfidence", 12, "Мир: бизнес возвращается к планированию", "default", difficulty, "other"),
					makeImpulse("capitalFlow", 16, "Возврат капитала после мира", "default", difficulty),
					makeImpulse("riskPremium", -.7, "Военная премия за риск уходит", "default", difficulty),
					sustainedImpulse("exportsGrowth", 1.4, 6, "Торговые каналы открываются заново")
				],
				news: {
					cat: "gov",
					headline: "ПРЕЗИДЕНТ ОБЪЯВЛЯЕТ О ЗАКЛЮЧЕНИИ МИРА",
					text: "Боевые действия прекращены решением главы государства. Часть ограничений снимут не сразу, а часть не снимут вовсе — но премия за риск, капитал и деловая уверенность начинают возвращаться уже в этом квартале.",
					priority: 10,
					chain: [
						"Мир",
						"Премия за риск ↓",
						"Капитал ↑",
						"Торговля ↑",
						"Рейтинг ↓"
					]
				}
			};
		}
	},
	{
		id: "seize_control",
		group: "war",
		severe: true,
		label: "Полный контроль над институтами",
		cost: 50,
		cooldown: 24,
		requires: (s) => s.politicalRegime === "authoritarian" && !!s.parliamentDissolved && (s.warQuartersLeft || 0) > 0,
		reqText: "Доступно во время войны при авторитарном режиме и распущенном парламенте",
		desc: "Суды, пресса и остатки самостоятельных ведомств переходят под прямое управление. Ведомства почти перестают отказывать, политический капитал копится сам — но инвестиции, производительность и капитал уходят из страны и обратно не возвращаются.",
		build: (s, difficulty) => ({
			patch: { totalize: true },
			impulses: [
				makeImpulse("tensionPush", 14, "Установление полного контроля", "fast", difficulty, "other"),
				makeImpulse("businessConfidence", -16, "Институты подчинены", "default", difficulty, "other"),
				makeImpulse("investment", -3.2, "Инвесторы уходят из страны", "default", difficulty),
				makeImpulse("capitalFlow", -20, "Бегство капитала", "default", difficulty),
				makeImpulse("riskPremium", .8, "Полный контроль над институтами", "default", difficulty),
				sustainedImpulse("productivity", -.1, 10, "Отбор по лояльности вместо отбора по результату"),
				makeImpulse("govTrust", -6, "Независимых источников информации не осталось", "default", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "УКАЗ ПРЕЗИДЕНТА: ИНСТИТУТЫ ПЕРЕХОДЯТ ПОД ПРЯМОЕ УПРАВЛЕНИЕ",
				text: "Суды, надзорные органы и оставшиеся независимые медиа подчинены администрации. Выборы отменены без назначения новой даты — сменить эту власть у урны больше нельзя. Отказать теперь почти невозможно и почти некому: цену такой управляемости страна платит инвестициями и людьми, которые умеют считать.",
				headlineHard: "УКАЗ ПРЕЗИДЕНТА: УПРАВЛЕНИЕ ГОСУДАРСТВОМ ПРИВЕДЕНО К ЕДИНОМУ ПОРЯДКУ",
				textHard: "Работа судов, надзорных органов и информационной сферы приведена к единому государственному стандарту. Проведение выборов отложено до нормализации обстановки. Собранность управления объявлена условием победы; отдельные хозяйственные структуры пересматривают инвестиционные планы.",
				priority: 10,
				chain: [
					"Указ президента",
					"Институты подчинены",
					"Тоталитарный режим",
					"Бегство капитала",
					"Производительность ↓"
				]
			}
		})
	},
	{
		id: "snap_election",
		group: "power",
		label: "Назначить досрочные выборы",
		cost: 28,
		cooldown: 16,
		requires: (s) => s.politicalRegime !== "totalitarian" && (s.quartersToElection || 0) > 4,
		reqText: "Доступно, если выборы вообще проводятся и до плановых больше 4 кв.",
		desc: "Пойти к урнам через два квартала вместо оставшегося срока. При высоком рейтинге — способ обменять сегодняшнюю популярность на новый полный срок; при низком — способ проиграть раньше.",
		build: (s, difficulty) => ({
			patch: { snapElection: 2 },
			impulses: [makeImpulse("businessConfidence", -5, "Досрочные выборы: неопределённость", "default", difficulty, "other"), makeImpulse("investment", -1, "Досрочные выборы: инвестиции ждут результата", "default", difficulty)],
			news: {
				cat: "gov",
				headline: "ПРЕЗИДЕНТ НАЗНАЧАЕТ ДОСРОЧНЫЕ ВЫБОРЫ",
				text: `Голосование через 2 кв. вместо запланированных ${s.quartersToElection}. При рейтинге ${Math.round(s.approval)} из 100 это ставка: выиграть — значит получить полный срок заново, проиграть — уйти раньше, чем пришлось бы.`,
				textHard: `Голосование состоится через 2 кв. вместо запланированных ${s.quartersToElection}. Руководство страны намерено досрочно получить подтверждение всенародной поддержки выбранного курса.`,
				priority: 9
			}
		})
	},
	{
		id: "labor",
		group: "reform",
		label: "Реформа рынка труда",
		cost: 26,
		once: true,
		desc: "Упростить наём и увольнение, перестроить пособия. Через два года структурная безработица ниже почти на процентный пункт — но первыми это почувствуют те, кого увольняют, и они это запомнят.",
		build: (s, difficulty) => {
			const authoritarianPress = s.politicalRegime === "authoritarian" || s.politicalRegime === "totalitarian";
			return {
				patch: { reform: "labor" },
				impulses: [
					makeImpulse("unemployment", .45, "Реформа рынка труда: перестройка занятости", "default", difficulty),
					makeImpulse("approvalPush", -6, "Непопулярная реформа рынка труда", "fast", difficulty, "other"),
					makeImpulse("tensionPush", 11, "Профсоюзы против реформы рынка труда", "fast", difficulty, "other")
				],
				news: {
					cat: "gov",
					headline: "ОБЪЯВЛЕНА РЕФОРМА РЫНКА ТРУДА",
					text: authoritarianPress ? "Правила найма и увольнения переписываются, пособия привязываются к активному поиску работы. Официально — реформа встречена трудовыми коллективами с пониманием и поддержкой." : "Правила найма и увольнения переписываются, пособия привязываются к активному поиску работы. Профсоюзы объявляют протест; экономисты напоминают, что структурная безработица снижается не указом, а годами.",
					priority: 8,
					chain: [
						"Реформа объявлена",
						"Протест профсоюзов",
						"Перестройка занятости",
						"Структурная безработица ↓"
					]
				}
			};
		}
	},
	{
		id: "pension",
		group: "reform",
		label: "Пенсионная реформа",
		cost: 42,
		once: true,
		desc: "Поднять возраст выхода на пенсию. Самое непопулярное решение из возможных — и единственное, которое одновременно расширяет рабочую силу и снимает постоянную нагрузку с бюджета.",
		build: (s, difficulty) => ({
			patch: { reform: "pension" },
			impulses: [
				sustainedImpulse("laborForce", .18, 12, "Пенсионная реформа: рабочая сила расширяется"),
				makeImpulse("approvalPush", -13, "Пенсионная реформа", "fast", difficulty, "other"),
				makeImpulse("tensionPush", 22, "Пенсионная реформа", "fast", difficulty, "other"),
				makeImpulse("consumerConfidence", -5, "Пенсионная реформа", "default", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "ПРЕЗИДЕНТ ОБЪЯВЛЯЕТ ПОВЫШЕНИЕ ПЕНСИОННОГО ВОЗРАСТА",
				text: `Рейтинг власти ${Math.round(s.approval)} из 100 до объявления. Бюджет получает постоянную экономию, рынок труда — дополнительные руки, а власть — самый тяжёлый разговор со страной из всех возможных.`,
				textHard: "Пенсионный возраст повышается. Решение объясняется растущей продолжительностью жизни и заботой о будущих поколениях: бюджет получает постоянную экономию, экономика — дополнительные рабочие руки.",
				priority: 9,
				chain: [
					"Реформа объявлена",
					"Рейтинг ↓↓",
					"Напряжённость ↑",
					"Рабочая сила ↑",
					"Выплаты ↓"
				]
			}
		})
	},
	{
		id: "courts",
		group: "reform",
		label: "Судебная реформа",
		cost: 34,
		once: true,
		requires: (s) => s.politicalRegime !== "totalitarian",
		reqText: "Недоступно при тоталитарном режиме: независимых судов при нём уже нет",
		desc: "Независимые суды и защита собственности. Ничего не даёт в этом квартале и почти всё — в горизонте пяти лет: премия за риск, прямые инвестиции и производительность зависят от того, можно ли выиграть спор у государства.",
		build: (s, difficulty) => ({
			patch: { reform: "courts" },
			impulses: [
				sustainedImpulse("productivity", .17, 10, "Судебная реформа: издержки на защиту собственности падают"),
				sustainedImpulse("fdi", .9, 8, "Судебная реформа привлекает прямые инвестиции", "other"),
				sustainedImpulse("businessConfidence", .8, 8, "Судебная реформа", "other"),
				makeImpulse("tensionPush", 8, "Судебная реформа задевает интересы элит", "fast", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "СУДЕБНАЯ РЕФОРМА: ПРЕЗИДЕНТ ОТДАЁТ ЧАСТЬ ВЛАСТИ",
				text: "Порядок назначения судей выводится из-под администрации, вводится реальная процедура спора с государством. Эффект не измеряется в этом квартале — он измеряется в премии за риск через пять лет.",
				priority: 8,
				chain: [
					"Реформа объявлена",
					"Элиты недовольны",
					"Защита собственности ↑",
					"Премия за риск ↓",
					"Инвестиции ↑"
				]
			}
		})
	},
	{
		id: "deregulation",
		group: "reform",
		label: "Дерегулирование бизнеса",
		cost: 24,
		once: true,
		desc: "Снять избыточные требования и проверки. Быстрая по меркам реформ отдача в производительности — и расплата доверием, когда первая же авария окажется на первых полосах.",
		build: (s, difficulty) => ({
			patch: { reform: "deregulation" },
			impulses: [
				sustainedImpulse("productivity", .21, 6, "Дерегулирование: издержки соблюдения требований падают"),
				makeImpulse("businessConfidence", 7, "Дерегулирование", "default", difficulty, "other"),
				makeImpulse("investment", .8, "Дерегулирование", "default", difficulty),
				makeImpulse("govTrust", -4, "Снятие требований воспринято как отказ государства от контроля", "default", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "ПРЕЗИДЕНТ ПОДПИСЫВАЕТ ПАКЕТ ДЕРЕГУЛИРОВАНИЯ",
				text: "Треть отраслевых требований отменена, плановые проверки сокращены. Бизнес доволен, контролирующие ведомства предупреждают, что цену такого решения обычно узнают внезапно.",
				priority: 7
			}
		})
	},
	{
		id: "education",
		group: "reform",
		label: "Реформа образования",
		cost: 28,
		once: true,
		desc: "Не про объём расходов — про их качество: программы, отбор преподавателей, связь школы с рынком труда. Самая медленная реформа в наборе: полный эффект — через четыре года, зато он не откатывается.",
		build: (s, difficulty) => ({
			patch: { reform: "education" },
			impulses: [makeImpulse("approvalPush", 2.5, "Реформа образования", "fast", difficulty, "other")],
			news: {
				cat: "gov",
				headline: "ОБЪЯВЛЕНА РЕФОРМА ОБРАЗОВАНИЯ",
				text: "Программы, отбор преподавателей и связь с работодателями переписываются целиком. Человеческий капитал — единственная величина в модели, которая растёт четыре года и не падает обратно.",
				priority: 7
			}
		})
	},
	{
		id: "infra_program",
		group: "reform",
		label: "Национальный проект: инфраструктура",
		cost: 26,
		cooldown: 16,
		desc: "Указ, который обязан исполнить Минфин: реальные госинвестиции растут ускоренно десять кварталов. Инфраструктура и потенциал растут вместе с дефицитом и долгом — за проект платит бюджет, а не политический капитал.",
		build: (s, difficulty) => ({
			impulses: [
				sustainedImpulse("govInvestmentPush", 3.4, 10, "Национальный проект: инфраструктура"),
				makeImpulse("approvalPush", 3, "Национальный проект: инфраструктура", "fast", difficulty, "other"),
				makeImpulse("businessConfidence", 4, "Национальный проект: инфраструктура", "default", difficulty, "other")
			],
			news: {
				cat: "gov",
				headline: "ПРЕЗИДЕНТ ЗАПУСКАЕТ НАЦИОНАЛЬНЫЙ ПРОЕКТ ПО ИНФРАСТРУКТУРЕ",
				text: `Указ обязывает Минфин ускорить реальные госинвестиции на несколько лет вперёд. Долг ${fmt1(s.debtToGdp)}% ВВП, баланс бюджета ${fmtSigned1(s.budgetBalancePctGdp)}% — считать придётся не президенту.`,
				priority: 8,
				chain: [
					"Указ подписан",
					"Госинвестиции ↑",
					"Дефицит ↑",
					"Инфраструктура ↑",
					"Потенциал ↑"
				]
			}
		})
	}
];
const PRES_BY_ID = {};
PRESIDENT_ACTIONS.forEach((a) => {
	PRES_BY_ID[a.id] = a;
});
const KIDS_BLOCKED_ACTIONS = /* @__PURE__ */ new Set([
	"dissolve",
	"crackdown",
	"military_parade"
]);
const kidsBlocked = (a) => a.group === "war" || KIDS_BLOCKED_ACTIONS.has(a.id);
const presActionAvailable = (a, s, cooldowns) => {
	if (a.group === "war" && s.economyOnly) return false;
	if (s.kidsMode && kidsBlocked(a)) return false;
	if (a.once && (s.reforms || {})[a.id] !== void 0) return false;
	if ((cooldowns[`pres:${a.id}`] || 0) > 0) return false;
	if (a.requires && !a.requires(s)) return false;
	return true;
};
function politicalCapitalRegen(x) {
	const cap = clamp(Number.isFinite(x.politicalCapital) ? x.politicalCapital : 55, 0, 100);
	return clamp(3.6 + clamp((x.approval - 50) / 8, -3.5, 3.5) + clamp((x.gdpGrowth - x.potentialGrowth) * .5, -1.5, 1.5) - (x.activeCrises || []).length * 1.2 - (x.unrestActive ? 2.5 : 0) + (x.politicalRegime === "totalitarian" ? 4.2 : x.politicalRegime === "authoritarian" ? 2.4 : 0) - .075 * cap, -10, 9);
}
function militaryCoupRisk(x) {
	const tension = clamp(x.politicalTension || 0, 0, 100);
	const pressure = clamp((tension - 40) / 45, 0, 1);
	const misery = clamp(((x.unemployment || 0) - (x.nairu || 5)) / 6, 0, 1) * .5 + clamp(((x.inflation || 0) - 8) / 20, 0, 1) * .5;
	const crisisLoad = clamp((x.activeCrises || []).length / 2, 0, 1);
	const weakness = clamp((45 - (x.approval || 0)) / 40, 0, 1);
	const naked = clamp((30 - (Number.isFinite(x.politicalCapital) ? x.politicalCapital : 55)) / 30, 0, 1);
	const sil = x.groupSupport && Number.isFinite(x.groupSupport.siloviki) ? x.groupSupport.siloviki : null;
	const silGap = sil === null ? 0 : sil - (x.approval || 0);
	const silMult = sil === null ? 1 : sil >= 60 ? .35 : silGap < -6 ? 1 + Math.min(1.5, (-6 - silGap) / 10) : silGap > 8 ? .75 : 1;
	const silAngry = sil !== null && sil < 35 && silGap < -6;
	const vulnerability = clamp(Math.max(pressure, weakness, silAngry ? .3 : 0) * 2, 0, 1);
	const grudge = silAngry ? Math.min(1, (-6 - silGap) / 24) * .05 : 0;
	const trouble = pressure * .11 + weakness * .045 + grudge + (misery * .055 + crisisLoad * .055) * vulnerability;
	return clamp(trouble * silMult * (1 + naked * .8) * (x.unrestActive ? 1.7 : 1), 0, .28);
}
function parliamentBlocksReform(s) {
	if (s.parliamentDissolved) return false;
	if (s.politicalRegime === "authoritarian" || s.politicalRegime === "totalitarian") return false;
	const tension = s.politicalTension || 0;
	const approval = Number.isFinite(s.approval) ? s.approval : 50;
	return tension >= 65 || approval <= 30;
}
function applyPresidentActions(s, ids, cooldowns, difficulty) {
	const impulses = [];
	const newsSpecs = [];
	const patch = {};
	let spent = 0;
	let budget = Number.isFinite(s.politicalCapital) ? s.politicalCapital : 55;
	const applied = [];
	const blocked = [];
	(ids || []).forEach((id) => {
		const a = PRES_BY_ID[id];
		if (!a || !presActionAvailable(a, s, cooldowns) || a.cost > budget) return;
		if (a.group === "reform" && parliamentBlocksReform(s)) {
			const blockCost = Math.round(a.cost * .4);
			budget -= blockCost;
			spent += blockCost;
			blocked.push(id);
			newsSpecs.push({
				cat: "gov",
				headline: `ПАРЛАМЕНТ ОТКЛОНИЛ ЗАКОНОПРОЕКТ: ${a.label.toUpperCase()}`,
				text: "Голосов не хватило: при текущем напряжении в обществе и рейтинге власти оппозиция консолидировалась против инициативы. Часть политического капитала потрачена на лоббирование впустую — само право внести законопроект снова никуда не делось.",
				priority: 7,
				chain: [
					"Законопроект внесён",
					"Напряжение/рейтинг",
					"Голосов не хватило",
					"Капитал потрачен впустую"
				]
			});
			return;
		}
		const r = a.build(s, difficulty) || {};
		budget -= a.cost;
		spent += a.cost;
		applied.push(id);
		if (a.cooldown) cooldowns[`pres:${a.id}`] = a.cooldown;
		(r.impulses || []).forEach((i) => impulses.push(i));
		if (r.news) newsSpecs.push(publicNews(r.news, s));
		Object.assign(patch, r.patch || {});
		if (r.patch && r.patch.reform) (patch.reforms = patch.reforms || []).push(r.patch.reform);
	});
	return {
		impulses,
		newsSpecs,
		spent,
		patch,
		applied,
		blocked
	};
}
function processPresidentialDirective(reqId, economy, cbPersonaId, mofPersonaId, decisions, strength) {
	const req = REQUESTS.find((r) => r.id === reqId);
	if (!req) return null;
	const asked = clamp(Number.isFinite(strength) ? strength : 1, .2, 4);
	const fit = fitStrength(req, economy, asked);
	const str = fit == null ? asked : fit;
	const toCb = req.from === "ministry_finance";
	const persona = toCb ? getCbPersona(cbPersonaId) : getMofPersona(mofPersonaId);
	const regime = economy.politicalRegime || "democracy";
	const authority = regime === "totalitarian" ? 4 : regime === "authoritarian" ? 1.8 : regime === "crisis" ? .15 : .55;
	const score = req.fit(economy) + (req.bias[persona.id] || 0) + authority + clamp((economy.approval - 50) / 55, -.9, .9) - (str - 1) * .8;
	let status = score >= 1 ? "accepted" : score >= .1 ? "partial" : "rejected";
	const own = directiveProgress(reqId, economy, decisions, economy, str);
	let byOwn = false;
	if (Number.isFinite(own) && own >= .9 && status !== "accepted") {
		status = "accepted";
		byOwn = true;
	} else if (Number.isFinite(own) && own >= .3 && status === "rejected") {
		status = "partial";
		byOwn = true;
	}
	const k = byOwn ? 0 : status === "accepted" ? 1 : status === "partial" ? .5 : 0;
	const credibilityHit = toCb && k > 0 ? -7 * k : 0;
	const finalDecisions = k > 0 ? {
		...decisions,
		...req.apply(decisions, k * str, economy),
		...req.id === "defense_up" ? { defensePledge: true } : {},
		...req.id === "tax_cut" ? { taxPledge: true } : {}
	} : decisions;
	const ownNote = byOwn ? status === "accepted" ? "Ведомство и без указания шло в ту же сторону — решение совпало с требованием. " : "Шаг в ту же сторону ведомство сделало по своим причинам, но меньше, чем требовали. " : "";
	return {
		req,
		status,
		score,
		toCb,
		persona,
		strength: str,
		ask: askText(req, str, "president", regime),
		decisions: finalDecisions,
		byOwn,
		text: ownNote + requestOutcomeText(req, status, economy, finalDecisions),
		credibilityHit,
		tension: status === "rejected" ? 5 : 0,
		coordination: status === "accepted" ? 5 : status === "partial" ? 2 : -6
	};
}
const APPOINT_COST = {
	central_bank: 22,
	ministry_finance: 14
};
function appointmentEffects(kind, s, difficulty, persona) {
	const tenure = (kind === "central_bank" ? s.cbTenure : s.mofTenure) || 0;
	const early = kind === "central_bank" ? Math.max(0, 12 - tenure) / 12 : 0;
	const impulses = [];
	if (kind === "central_bank") {
		impulses.push(makeImpulse("cbCredibilityPush", -6 - 9 * early, "Смена главы ЦБ решением президента", "fast", difficulty, "other"));
		impulses.push(makeImpulse("riskPremium", .15 + .25 * early, "Смена главы ЦБ решением президента", "default", difficulty));
	} else impulses.push(makeImpulse("businessConfidence", -4, "Смена министра финансов", "default", difficulty, "other"));
	const stance = String(persona.title || persona.name || "").toLowerCase();
	return {
		impulses,
		news: {
			cat: kind === "central_bank" ? "cb" : "gov",
			headline: kind === "central_bank" ? "ПРЕЗИДЕНТ МЕНЯЕТ ГЛАВУ ЦЕНТРАЛЬНОГО БАНКА" : "ПРЕЗИДЕНТ МЕНЯЕТ МИНИСТРА ФИНАНСОВ",
			text: kind === "central_bank" ? `Предшественник проработал ${tenure} кв. ${early > .5 ? "Досрочная отставка главы ЦБ читается однозначно: независимость заканчивается там, где начинается администрация, и ожидания это учтут." : "Срок отработан полностью, и смена выглядит плановой — доверие к политике задето, но не сломано."} Новый глава известен как сторонник курса «${stance}».` : `Смена руководства Минфина меняет и логику бюджета: новый министр придёт со своим представлением о том, что такое допустимый дефицит, — в правительстве его называют сторонником курса «${stance}».`,
			priority: 9
		},
		cost: APPOINT_COST[kind]
	};
}
const getPresPersona = (id) => PRESIDENT_PERSONAS.find((p) => p.id === id) || PRESIDENT_PERSONAS[0];
const PRES_REQ_LEAN = {
	rate_cut: {
		pop: 1,
		ref: -.3
	},
	rate_hike: {
		pop: -1,
		ref: .5
	},
	rate_hold: {
		pop: .5,
		ref: -.1
	},
	liquidity_help: {
		pop: .3,
		ref: .1
	},
	capreq_ease: {
		pop: .4,
		ref: -.2
	},
	fx_support: {
		pop: .5,
		ref: -.1
	},
	infra_up: {
		pop: .6,
		ref: .6
	},
	deficit_cut: {
		pop: -1,
		ref: .6
	},
	transfers_freeze: {
		pop: -1,
		ref: .4
	},
	tax_relief_business: {
		pop: -.2,
		ref: .6
	},
	tax_cut: {
		pop: .8,
		ref: .2
	},
	fiscal_hold: {
		pop: -.6,
		ref: .4
	},
	defense_up: {
		pop: .4,
		ref: -.2
	}
};
function directiveProgress(reqId, baseDecisions, finalDecisions, economy, strength) {
	const req = REQUESTS.find((r) => r.id === reqId);
	if (!req || !baseDecisions || !finalDecisions) return null;
	if (req.hold) {
		const ref = economy || baseDecisions;
		let worst = 1;
		req.hold.forEach(({ key, dir }) => {
			const before = Number.isFinite(ref[key]) ? ref[key] : baseDecisions[key];
			const after = finalDecisions[key];
			if (![before, after].every(Number.isFinite)) return;
			const step = (after - before) * dir;
			if (step <= 1e-6) return;
			worst = Math.min(worst, clamp(1 - step / (Math.max(.5, Math.abs(before) * .2 + 1) / 3), 0, 1));
		});
		return worst;
	}
	if (req.progress) return req.progress(baseDecisions, finalDecisions, strength);
	const want = req.apply(baseDecisions, strength || 1, economy || baseDecisions);
	let total = 0;
	let sum = 0;
	Object.keys(want).forEach((k) => {
		const target = want[k];
		const before = baseDecisions[k];
		const after = finalDecisions[k];
		if (![
			target,
			before,
			after
		].every(Number.isFinite)) return;
		const need = target - before;
		if (Math.abs(need) < 1e-6) return;
		total += 1;
		sum += clamp((after - before) / need, 0, 1);
	});
	if (!total) return null;
	return sum / total;
}
const DIRECTIVE_PART = .35;
const directiveVerdict = (p) => p === null || p === void 0 ? null : p >= .75 ? "met" : p >= .35 ? "partial" : "ignored";
const BOT_CORE_GROUPS = {
	technocrat: ["business", "public"],
	populist: [
		"pensioners",
		"workers",
		"regions"
	],
	strongman: ["siloviki", "pensioners"],
	reformer: ["business", "youth"]
};
function botPresident(s, personaId, difficulty, ctx) {
	const P = getPresPersona(personaId);
	const opts = ctx || {};
	const playerBranch = opts.playerBranch || null;
	const capital = Number.isFinite(s.politicalCapital) ? s.politicalCapital : 55;
	const sat = Number.isFinite(s.presidentSatisfaction) ? s.presidentSatisfaction : 60;
	const crises = (s.activeCrises || []).length;
	const tension = s.politicalTension || 0;
	const wish = [];
	if (tension >= 50 && P.power > .5) wish.push("crackdown");
	if (tension >= 62 && P.power >= .9 && !s.parliamentDissolved) wish.push("dissolve");
	if (P.power >= .9 && s.politicalRegime === "authoritarian" && s.parliamentDissolved) wish.push("seize_control");
	if (s.parliamentDissolved && P.power < 0 && tension < 35) wish.push("restore_parliament");
	if (s.approval < 45) wish.push("address");
	if (tension >= 40 && P.power <= .5) wish.push("elite_deal");
	if (s.approval < 48) wish.push("address");
	if (P.reform >= .8) {
		if (s.unemployment > s.nairu + 1) wish.push("labor");
		wish.push("courts", "deregulation", "education");
		if (s.debtToGdp > 90) wish.push("pension");
	}
	if (P.populism < 0 && s.debtToGdp > 88) wish.push("pension");
	wish.push("infra_program");
	const sup = s.groupSupport || {};
	const low = (g, lim) => Number.isFinite(sup[g]) && sup[g] < lim;
	const core = BOT_CORE_GROUPS[P.id] || [];
	if (low("siloviki", 40)) wish.unshift("military_parade");
	if (low("regions", 38)) wish.unshift("infra_program");
	if (low("pensioners", 38) && core.includes("pensioners")) wish.unshift("address");
	const hurtsAllies = (id) => Object.entries(ACTION_GROUP_EFFECTS[id] || {}).some(([g, v]) => v < 0 && (core.includes(g) && low(g, 45) || v <= -10 && low(g, 35)));
	const actions = [];
	for (const id of wish) {
		const a = PRES_BY_ID[id];
		if (!a || actions.length) continue;
		if (a.cost > capital - 12) continue;
		if (hurtsAllies(id) && !(id === "crackdown" && P.id === "strongman")) continue;
		if (!presActionAvailable(a, s, opts.cooldowns || {})) continue;
		actions.push(id);
	}
	const branchOf = (req) => req.from === "ministry_finance" ? "monetary" : "fiscal";
	const scoreReq = (req) => {
		const lean = PRES_REQ_LEAN[req.id] || {
			pop: 0,
			ref: 0
		};
		return req.fit(s) + lean.pop * P.populism * 1.8 + lean.ref * P.reform * 1.3 + (playerBranch && branchOf(req) === playerBranch ? .6 : 0);
	};
	const scored = REQUESTS.filter((r) => !r.retired && fitStrength(r, s) != null).map((r) => ({
		req: r,
		sc: scoreReq(r)
	})).sort((a, b) => b.sc - a.sc);
	const band = (lim) => scored.filter((x) => x.sc >= scored[0].sc - lim);
	const dirAgo = Number.isFinite(opts.lastDirectiveAgo) ? opts.lastDirectiveAgo : 99;
	const avoidLast = dirAgo <= 2;
	const notLast = (list) => avoidLast ? list.filter((x) => x.req.id !== opts.lastReqId) : list;
	const shortlist = notLast(band(.5)).length ? notLast(band(.5)) : notLast(band(1.2));
	const best = shortlist.length ? shortlist[Math.floor(rng() * shortlist.length)] : null;
	const threshold = 1.5 - P.pressure * 1.2 + (sat > 70 ? .4 : 0) + (dirAgo <= 1 ? .8 : 0);
	const canPressure = capital >= 16;
	const strength = best ? fitStrength(best.req, s) : 1;
	const directive = canPressure && best && best.sc >= threshold ? {
		reqId: best.req.id,
		branch: branchOf(best.req),
		toPlayer: branchOf(best.req) === playerBranch,
		req: best.req,
		strength,
		ask: askText(best.req, strength, "president", s.politicalRegime)
	} : null;
	let appointBot = null;
	const botBranch = playerBranch === "monetary" ? "fiscal" : playerBranch === "fiscal" ? "monetary" : null;
	const tenure = botBranch === "monetary" ? s.cbTenure || 0 : s.mofTenure || 0;
	if (botBranch && tenure >= 8 && capital > 40) {
		if (botBranch === "monetary") {
			const want = P.populism > .5 ? "dove" : P.populism < -.2 ? "hawk" : "pragmatic";
			if (want !== opts.cbPersonaId && (s.inflation > s.inflationTarget + 3 || s.unemployment > s.nairu + 2)) appointBot = {
				kind: "central_bank",
				persona: want
			};
		} else {
			const want = P.populism > .5 ? "populist" : P.reform > .7 ? "technocrat" : "austerity";
			if (want !== opts.mofPersonaId && (s.debtToGdp > 90 || s.unemployment > s.nairu + 2)) appointBot = {
				kind: "ministry_finance",
				persona: want
			};
		}
	}
	const mood = sat >= 70 ? "доволен" : sat >= 40 ? "сдержан" : sat >= 20 ? "недоволен" : "на грани";
	const quote = (() => {
		if (sat < 20) return "Я назначаю людей не для того, чтобы они объясняли мне, почему ничего нельзя сделать. Терпение администрации не бесконечно.";
		if (crises > 0) return `В стране ${crises === 1 ? "кризис" : "сразу несколько кризисов"}, и объяснения меня интересуют меньше, чем результат. Работайте.`;
		if (P.id === "populist") return `Люди не едят проценты по ставке и не носят домой бюджетное правило. Рейтинг власти ${Math.round(s.approval)} — вот единственная отчётность, которая имеет значение.`;
		if (P.id === "strongman") return "Государство — это вертикаль. Ведомства исполняют, а не обсуждают; обсуждать будем после того, как исполнено.";
		if (P.id === "reformer") return "Всё, что мы сделаем за этот срок, начнёт работать при следующем. Это не повод не делать — это единственная причина делать сейчас.";
		return "У ведомств есть свои мандаты, и я в них не вмешиваюсь без нужды. Нужда определяется цифрами, а не настроением.";
	})();
	return {
		persona: P,
		actions,
		directive,
		appointBot,
		mood,
		quote,
		satisfaction: sat,
		newsHeadline: `ПРЕЗИДЕНТ ${directive ? `→ ${directive.branch === "monetary" ? "ЦБ" : "МИНФИН"}: ${directive.req.label.toUpperCase()}` : "О ПОЛОЖЕНИИ ДЕЛ"}`,
		demand: directive ? `Президент (${P.name}): ${directive.ask}` : null
	};
}
function presidentSatisfactionNext(prev, x) {
	const raw = x.directiveMet;
	const p = raw === true ? 1 : raw === false ? 0 : Number.isFinite(raw) ? clamp(raw, 0, 1) : null;
	const harsh = clamp(1.6 - x.patience * .6, .6, 1.3);
	const base = p === null ? 1.8 : p >= .75 ? 9 : p >= .35 ? 1 : -13 * harsh * (1 - p / DIRECTIVE_PART * .4);
	return clamp(prev + base + clamp((x.approval - 50) / 12, -2.5, 2.5) + clamp((x.gdpGrowth - x.potentialGrowth) * .6, -1.5, 1.5) - (x.activeCrises || []).length * 1.2, 0, 100);
}
// src/lib/world/diplomacy.js
const NEIGHBOR_IDS = [
	"north",
	"west",
	"southwest"
];
const NB = {
	north: {
		name: "Норланд",
		gen: "Норланда",
		dat: "Норланду",
		ins: "с Норландом",
		up: "НОРЛАНД"
	},
	west: {
		name: "Вестравия",
		gen: "Вестравии",
		dat: "Вестравии",
		ins: "с Вестравией",
		up: "ВЕСТРАВИЯ"
	},
	southwest: {
		name: "Дешт",
		gen: "Дешта",
		dat: "Дешту",
		ins: "с Дештом",
		up: "ДЕШТ"
	}
};
const RELATIONS_START = {
	north: 50,
	west: 64,
	southwest: 40
};
function relationsOf(s) {
	return {
		...RELATIONS_START,
		...s.relations
	};
}
function atWarWith(s, c) {
	if (!((s.warQuartersLeft || 0) > 0)) return false;
	if (s.warType === "offensive") return warTargetOf(s) === c;
	return c === "southwest" ? s.warType === "defensive" : c === "north" ? s.warType === "revanche" : false;
}
function relationTarget(s, c) {
	if (atWarWith(s, c)) return 4;
	const tr = (s.diploTreaties || {})[c] > 0 ? 10 : 0;
	const sanc = (s.diploSanctions || {})[c] > 0 ? -30 : 0;
	if (c === "west") {
		if ((s.sanctionsQuartersLeft || 0) > 0) return 15;
		return clamp(62 + (s.tradeBlocActive ? 14 : 0) + tr + sanc, 5, 92);
	}
	if (c === "north") {
		const held = (s.annexed || []).length;
		const t = s.treaty;
		const base = held ? (t && t.recognized ? 58 : 38) - Math.max(0, s.norlandRevanche || 0) * .3 : 50;
		return clamp(base + tr + sanc, 5, 90);
	}
	return clamp(40 + tr + sanc - ((s.deshtMobilized || 0) > 0 ? 8 : 0), 5, 85);
}
function deshtWarMultiplier(s) {
	const rel = relationsOf(s).southwest;
	const calm = (s.deshtCalm || 0) > 0 ? .3 : 1;
	const mob = (s.deshtMobilized || 0) > 0 ? 1.6 : 1;
	return clamp((1 + (40 - rel) / 25) * calm * mob, .2, 3.5);
}
function deshtAttackRoll(s) {
	const rel = relationsOf(s).southwest;
	if ((s.warQuartersLeft || 0) > 0 || !((s.deshtMobilized || 0) > 0) || rel >= 22 || (s.deshtCalm || 0) > 0) return false;
	return rng() < .3 + (22 - rel) * .02;
}
const DIPLO_BY_ID = Object.fromEntries([
	{
		id: "trade",
		label: "Торговый договор",
		cost: 12,
		desc: "Снять пошлины на три года: растёт экспорт, а отношения держатся выше. Нужны хотя бы ровные отношения.",
		can: (s, c) => relationsOf(s)[c] >= 45 && !((s.diploTreaties || {})[c] > 0) && !((s.diploSanctions || {})[c] > 0) || null,
		why: "нужны отношения от 45, без санкций и без уже действующего договора"
	},
	{
		id: "aid",
		label: "Помощь",
		cost: 6,
		desc: "Гуманитарная помощь и льготный кредит: около 0,3% ВВП из бюджета, зато отношения заметно теплеют.",
		can: (s, c) => !((s.diploCooldown || {})[`aid:${c}`] > 0) || null,
		why: "помощь уже отправлялась недавно"
	},
	{
		id: "ultimatum",
		label: "Ультиматум",
		cost: 10,
		desc: "Потребовать уступки под угрозой. Сильная армия повышает шансы; отказ — удар по отношениям и повод для ответа.",
		can: (s, c) => !((s.diploCooldown || {})[`ultimatum:${c}`] > 0) || null,
		why: "ультиматум уже звучал недавно"
	},
	{
		id: "sanctions",
		label: "Санкции",
		cost: 14,
		desc: "Ограничить торговлю: внутри — сплочение, снаружи — разрыв. Против Вестравии бьёт по своим же ценам и инвестициям.",
		can: (s, c) => !((s.diploSanctions || {})[c] > 0) && !(c === "west" && (s.sanctionsQuartersLeft || 0) > 0) || null,
		why: "санкции уже действуют"
	}
].map((a) => [a.id, a]));
const ULTIMATUM_DEMAND = {
	west: "снизить пошлины на наш экспорт",
	north: "отвести войска от новой границы и прекратить провокации",
	southwest: "отвести войска от границы"
};
function diploActionAvailable(s, c, id) {
	const a = DIPLO_BY_ID[id];
	if (!a || !NB[c] || atWarWith(s, c)) return false;
	return !!a.can(s, c);
}
function ultimatumChance(s, c) {
	const base = {
		west: .25,
		north: .4,
		southwest: .35
	}[c];
	const rel = relationsOf(s)[c];
	return clamp(base + (warStrength(s) - 1) * .35 + (rel < 15 ? -.1 : 0), .08, .8);
}
const NEIGHBOR_EVENTS = [
	{
		id: "border_incident",
		weight: 3,
		countries: ["north", "southwest"],
		when: (s, c) => relationsOf(s)[c] < 62,
		days: 1,
		def: "protest",
		title: (c) => `Пограничный инцидент ${NB[c].ins}`,
		text: (c) => `Патруль ${NB[c].gen} задержал наших пограничников на спорном участке. Ждут реакции президента.`,
		options: [
			{
				id: "protest",
				label: "Нота протеста",
				note: "отношения −4, рейтинг +1",
				rel: -4,
				approval: 1
			},
			{
				id: "hush",
				label: "Замять тихо",
				note: "отношения +4, рейтинг −1,5",
				rel: 4,
				approval: -1.5
			},
			{
				id: "retaliate",
				label: "Ответить силой",
				note: "отношения −14, рейтинг +3, риск эскалации",
				rel: -14,
				approval: 3,
				escalate: true
			}
		]
	},
	{
		id: "loan_request",
		weight: 2,
		countries: [
			"north",
			"west",
			"southwest"
		],
		when: (s, c) => relationsOf(s)[c] >= 30,
		days: 1,
		def: "decline",
		title: (c) => `${NB[c].name} просит кредит`,
		text: (c) => `Правительство ${NB[c].gen} просит заём около 0,4% нашего ВВП на два года — под проценты, но с риском, что отдавать будут долго.`,
		options: [{
			id: "lend",
			label: "Дать заём",
			note: "бюджет −0,4% ВВП сейчас, возврат с процентами позже; отношения +15",
			rel: 15,
			loan: true
		}, {
			id: "decline",
			label: "Отказать",
			note: "отношения −6",
			rel: -6
		}]
	},
	{
		id: "refugees",
		weight: 1.5,
		countries: ["southwest", "north"],
		when: (s, c) => !atWarWith(s, c),
		days: 1,
		def: "close",
		title: (c) => `Беженцы из ${NB[c].gen}`,
		text: (c) => `В ${NB[c].dat} кризис: у нашей границы около 80 тысяч человек. Принять — это рабочие руки и расходы, закрыть — тишина внутри и холод снаружи.`,
		options: [{
			id: "accept",
			label: "Принять",
			note: "рабочая сила ↑, выплаты ↑, напряжение +2; Вестравия и сосед теплеют",
			rel: 6,
			westRel: 5,
			accept: true
		}, {
			id: "close",
			label: "Закрыть границу",
			note: "напряжение −1; Вестравия −4",
			rel: -3,
			westRel: -4,
			tension: -1
		}]
	},
	{
		id: "west_deal",
		weight: 2,
		countries: ["west"],
		when: (s) => relationsOf(s).west >= 45 && (s.sanctionsQuartersLeft || 0) <= 0,
		days: 2,
		def: "pass",
		title: () => "Вестравия предлагает контракт",
		text: () => "Концерны Вестравии готовы закупать нашу продукцию по контракту на два года — если ответим в течение двух кварталов. Взамен просят открыть рынок для своих станков.",
		options: [{
			id: "sign",
			label: "Подписать",
			note: "экспорт ↑ на два года, отношения +6; свой бизнес поворчит",
			rel: 6,
			deal: "west"
		}, {
			id: "pass",
			label: "Отказаться",
			note: "отношения −3",
			rel: -3
		}]
	},
	{
		id: "desht_deal",
		weight: 1.5,
		countries: ["southwest"],
		when: (s) => relationsOf(s).southwest >= 30 && !atWarWith(s, "southwest"),
		days: 2,
		def: "pass",
		title: () => "Дешт предлагает дешёвое зерно и нефть",
		text: () => "Ашкала готова продавать зерно и нефть ниже рынка — два квартала на ответ. Вестравия такое сближение не одобрит.",
		options: [{
			id: "sign",
			label: "Согласиться",
			note: "цены ниже на год, Дешт +8, Вестравия −4",
			rel: 8,
			westRel: -4,
			deal: "southwest"
		}, {
			id: "pass",
			label: "Отказаться",
			note: "Дешт −3",
			rel: -3
		}]
	}
];
const NB_EVENT_BY_ID = Object.fromEntries(NEIGHBOR_EVENTS.map((e) => [e.id, e]));
function botDiplomacy(s, personaId, capitalLeft = 99) {
	const out = {
		action: null,
		reply: null
	};
	const ev = s.neighborEvent;
	if (ev && NB_EVENT_BY_ID[ev.id]) out.reply = {
		border_incident: personaId === "strongman" ? "retaliate" : personaId === "technocrat" ? "hush" : "protest",
		loan_request: personaId === "technocrat" && s.debtToGdp < 70 ? "lend" : personaId === "populist" ? "decline" : relationsOf(s)[ev.country] < 45 ? "lend" : "decline",
		refugees: personaId === "technocrat" && s.unemployment < 6.5 ? "accept" : "close",
		west_deal: personaId === "strongman" ? "pass" : "sign",
		desht_deal: personaId === "technocrat" ? "sign" : personaId === "strongman" ? "sign" : "pass"
	}[ev.id] || NB_EVENT_BY_ID[ev.id].def;
	const rel = relationsOf(s);
	const tryAct = (c, id) => {
		if (!out.action && diploActionAvailable(s, c, id) && DIPLO_BY_ID[id].cost <= capitalLeft) out.action = {
			country: c,
			kind: id
		};
	};
	if ((s.deshtMobilized || 0) > 0) tryAct("southwest", personaId === "technocrat" ? "aid" : "ultimatum");
	if (personaId === "technocrat") tryAct("west", "trade");
	if (rel.west < 50 && personaId !== "strongman") tryAct("west", "aid");
	if (personaId === "populist" && rel.southwest >= 45) tryAct("southwest", "trade");
	return out;
}
function sanitizeDiplomacy(raw, s) {
	const r = raw && typeof raw === "object" ? raw : {};
	const a = r.action && typeof r.action === "object" && diploActionAvailable(s, r.action.country, r.action.kind) ? {
		country: r.action.country,
		kind: r.action.kind
	} : null;
	const ev = s.neighborEvent && NB_EVENT_BY_ID[s.neighborEvent.id];
	return {
		action: a,
		reply: ev && ev.options.some((o) => o.id === r.reply) ? r.reply : null
	};
}
function diplomacyStep(s, decisions, difficulty, q, capitalLeft, noEvents, presApplied) {
	const out = {
		impulses: [],
		news: [],
		spent: 0,
		sanctionsWest: false,
		revancheDelta: 0,
		last: null
	};
	const rel = relationsOf(s);
	const treaties = { ...s.diploTreaties };
	const sanctions = { ...s.diploSanctions };
	const cooldown = { ...s.diploCooldown };
	Object.keys(cooldown).forEach((k) => {
		cooldown[k] = Math.max(0, cooldown[k] - 1);
	});
	let mobilized = Math.max(0, (s.deshtMobilized || 0) - 1);
	let calm = Math.max(0, (s.deshtCalm || 0) - 1);
	let event = s.neighborEvent || null;
	const nGdp = s.nominalGdp || 0;
	const push = (...imps) => out.impulses.push(...imps);
	const shift = (c, v) => {
		rel[c] = clamp(rel[c] + v, 0, 100);
	};
	NEIGHBOR_IDS.forEach((c) => {
		rel[c] = clamp(rel[c] + .15 * (relationTarget(s, c) - rel[c]), 0, 100);
	});
	if ((presApplied || []).includes("sanctions_impose")) shift("west", -30);
	if ((presApplied || []).includes("trade_bloc")) shift("west", 12);
	const dip = sanitizeDiplomacy(decisions.diplomacy, s);
	if (event && NB_EVENT_BY_ID[event.id]) {
		const def = NB_EVENT_BY_ID[event.id];
		const expired = q >= event.deadline;
		const optId = dip.reply || (expired ? def.def : null);
		if (optId) {
			const o = def.options.find((x) => x.id === optId) || def.options[0];
			const c = event.country;
			shift(c, o.rel || 0);
			if (o.westRel) shift("west", o.westRel);
			if (o.approval) push(makeImpulse("approvalPush", o.approval, def.title(c), "fast", difficulty, "other"));
			if (o.tension) push(makeImpulse("tensionPush", o.tension, def.title(c), "fast", difficulty, "other"));
			if (o.escalate && c === "southwest" && rel.southwest < 30) mobilized = Math.max(mobilized, 4);
			if (o.escalate && c === "north") out.revancheDelta += 8;
			if (o.loan) push(sustainedImpulse("revenue", -nGdp * .8 / 100, 2, `Заём ${NB[c].dat}`), taperedImpulse("revenue", [
				0,
				0,
				0,
				0,
				0,
				0,
				.26,
				.26,
				.26,
				.26
			].map((k) => k * nGdp / 100 * (rel[c] >= 25 ? 1 : .4)), `${NB[c].name} возвращает заём`));
			if (o.accept) push(makeImpulse("laborForce", .25, "Беженцы пополнили рабочую силу", "slow", difficulty, "other"), sustainedImpulse("transfersPressure", .25, 4, "Расходы на размещение беженцев"), makeImpulse("tensionPush", 2, "Беженцы: часть общества против", "fast", difficulty, "other"));
			if (o.deal === "west") cooldown["ev:west_deal"] = 12;
			if (o.deal === "southwest") cooldown["ev:desht_deal"] = 8;
			if (o.deal === "west") push(sustainedImpulse("exportsGrowth", .5, 8, "Долгий контракт с концернами Вестравии"), makeImpulse("businessConfidence", 2, "Контракт с Вестравией", "default", difficulty, "other"), makeImpulse("tensionPush", 1.2, "Рынок открыт для станков Вестравии", "fast", difficulty, "other"));
			if (o.deal === "southwest") push(sustainedImpulse("inflationSupply", -.2, 4, "Дешёвое зерно и нефть из Дешта"));
			out.news.push([
				"world",
				`${def.title(c).toUpperCase()}: ${o.label.toUpperCase()}`,
				`${dip.reply ? "Президент выбрал" : "Срок ответа вышел — по умолчанию"}: ${o.label.toLowerCase()}. ${o.note}.`,
				6
			]);
			out.resolved = {
				id: event.id,
				country: c,
				option: o.id,
				q
			};
			event = null;
		}
	}
	const act = dip.action;
	if (act && DIPLO_BY_ID[act.kind].cost <= capitalLeft) {
		const a = DIPLO_BY_ID[act.kind];
		const c = act.country;
		out.spent += a.cost;
		let ok = true;
		if (a.id === "trade") {
			treaties[c] = 12;
			shift(c, 8);
			push(makeImpulse("businessConfidence", 2, `Торговый договор ${NB[c].ins}`, "default", difficulty, "other"));
			out.news.push([
				"world",
				`ТОРГОВЫЙ ДОГОВОР ${NB[c].ins.toUpperCase()}`,
				`Пошлины сняты на три года. ${c === "west" ? "Вестравия — главный рынок для нашего экспорта: эффект будет заметным." : "Оборот невелик, но отношения держатся ровнее."}`,
				7
			]);
		} else if (a.id === "aid") {
			cooldown[`aid:${c}`] = 4;
			shift(c, 14);
			push(sustainedImpulse("revenue", -nGdp * .6 / 100, 2, `Помощь ${NB[c].dat}`));
			out.news.push([
				"world",
				`ПОМОЩЬ ${NB[c].dat.toUpperCase()}`,
				`Гуманитарные грузы и льготный кредит — около 0,3% ВВП. В ${NB[c].gen === "Дешта" ? "Ашкале" : NB[c].gen === "Норланда" ? "Эльвборге" : "Вестграде"} благодарят.`,
				6
			]);
		} else if (a.id === "ultimatum") {
			cooldown[`ultimatum:${c}`] = 6;
			ok = rng() < ultimatumChance(s, c);
			shift(c, ok ? -12 : -24);
			push(makeImpulse("approvalPush", ok ? 3 : -1, `Ультиматум ${NB[c].dat}`, "fast", difficulty, "other"));
			if (ok) {
				if (c === "west") push(sustainedImpulse("exportsGrowth", .5, 6, "Вестравия снизила пошлины после ультиматума"));
				if (c === "north") out.revancheDelta -= 30;
				if (c === "southwest") {
					mobilized = 0;
					calm = 8;
				}
			} else {
				push(makeImpulse("riskPremium", .15, `${NB[c].name} отверг ультиматум`, "default", difficulty));
				if (c === "southwest") mobilized = Math.max(mobilized, 3);
				if (c === "north") out.revancheDelta += 10;
			}
			out.news.push([
				"world",
				ok ? `${NB[c].up} УСТУПИЛ УЛЬТИМАТУМУ` : `${NB[c].up} ОТВЕРГ УЛЬТИМАТУМ`,
				ok ? `Требование ${ULTIMATUM_DEMAND[c]} выполнено. Отношения испорчены, но своё страна получила.` : `Требование ${ULTIMATUM_DEMAND[c]} отвергнуто. Отношения рухнули, а угроза, которую не исполнили, стоит репутации.`,
				8
			]);
		} else if (a.id === "sanctions") {
			shift(c, -30);
			if (c === "west") {
				out.sanctionsWest = true;
				push(...PRES_BY_ID.sanctions_impose.build(s, difficulty).impulses);
			} else {
				sanctions[c] = 8;
				push(makeImpulse("approvalPush", 2, `Санкции против ${NB[c].gen}`, "fast", difficulty, "other"));
			}
			out.news.push([
				"world",
				`САНКЦИИ ПРОТИВ ${NB[c].gen.toUpperCase()}`,
				c === "west" ? "Главный торговый партнёр под ограничениями: подорожает импорт, осторожнее станут инвесторы." : `Торговля ${NB[c].ins} ограничена на два года. Оборот невелик — удар больше политический.`,
				8
			]);
		}
		out.last = {
			country: c,
			kind: a.id,
			ok,
			q
		};
	}
	NEIGHBOR_IDS.forEach((c) => {
		if (treaties[c] > 0) treaties[c] -= 1;
		if (sanctions[c] > 0) sanctions[c] -= 1;
	});
	if (!atWarWith(s, "west")) {
		const x = clamp((rel.west - 60) / 40, -1.5, 1);
		const tr = (s.diploTreaties || {}).west > 0 ? 1 : 0;
		push(sustainedImpulse("exportsGrowth", .5 * x + .6 * tr, 1, "Отношения с Вестравией"), sustainedImpulse("capitalFlow", 3 * x, 1, "Банки Вестравии"), sustainedImpulse("riskPremium", -.03 * x, 1, "Кредит банков Вестравии"));
	}
	if (!atWarWith(s, "southwest")) {
		const x = clamp((rel.southwest - 40) / 40, -1, 1);
		const tr = (s.diploTreaties || {}).southwest > 0 ? 1 : 0;
		const sc = (s.diploSanctions || {}).southwest > 0 ? 1 : 0;
		push(sustainedImpulse("exportsGrowth", .15 * x + .3 * tr - .3 * sc, 1, "Торговля с Дештом"), sustainedImpulse("inflationSupply", -.05 * x - .05 * tr + .1 * sc, 1, "Зерно и нефть Дешта"));
	}
	if (!atWarWith(s, "north")) {
		const x = clamp((rel.north - 50) / 50, -1, 1);
		const tr = (s.diploTreaties || {}).north > 0 ? 1 : 0;
		const sc = (s.diploSanctions || {}).north > 0 ? 1 : 0;
		push(sustainedImpulse("exportsGrowth", .12 * x + .2 * tr - .25 * sc, 1, "Торговля с Норландом"));
		if ((s.annexed || []).length) out.revancheDelta += -(rel.north - 45) * .06;
	}
	if (!noEvents) NEIGHBOR_IDS.forEach((c) => {
		if (atWarWith(s, c) || (cooldown[`hostile:${c}`] || 0) > 0 || rel[c] >= 25) return;
		if (rng() >= (25 - rel[c]) / 25 * .3) return;
		cooldown[`hostile:${c}`] = 6;
		if (c === "west") {
			push(sustainedImpulse("exportsGrowth", -.7, 6, "Пошлины Вестравии"), makeImpulse("capitalFlow", -8, "Пошлины Вестравии", "default", difficulty));
			out.news.push([
				"world",
				"ВЕСТРАВИЯ ВВОДИТ ПОШЛИНЫ НА НАШ ЭКСПОРТ",
				`Отношения ${Math.round(rel.west)} из 100 — и Вестград отвечает своим ходом: пошлины на полтора года. Экспорт просядет.`,
				8
			]);
		} else if (c === "north") {
			push(sustainedImpulse("exportsGrowth", -.3, 4, "Норланд перекрыл транзит"));
			out.revancheDelta += 12;
			shift("north", -3);
			out.news.push([
				"world",
				"НОРЛАНД ПЕРЕКРЫЛ ТРАНЗИТ И РЫБОЛОВНЫЕ ВОДЫ",
				`Эльвборг наказывает за холодные отношения (${Math.round(rel.north)} из 100): грузы идут в обход, реваншисты в Норланде громче.`,
				8
			]);
		} else if (!(mobilized > 0)) {
			mobilized = 6;
			push(makeImpulse("businessConfidence", -3, "Дешт стягивает войска", "default", difficulty, "other"), makeImpulse("riskPremium", .1, "Дешт стягивает войска", "default", difficulty));
			out.news.push([
				"crisis",
				"ДЕШТ СТЯГИВАЕТ ВОЙСКА К ГРАНИЦЕ",
				`Отношения ${Math.round(rel.southwest)} из 100. Если их не поправить — помощью, договором или ультиматумом, — Дешт может напасть.`,
				9
			]);
		}
	});
	if (!event && !noEvents && rng() < .18) {
		const pool = [];
		NEIGHBOR_EVENTS.forEach((e) => e.countries.forEach((c) => {
			if (!atWarWith(s, c) && e.when(s, c) && !(cooldown[`ev:${e.id}`] > 0)) pool.push([e, c]);
		}));
		if (pool.length) {
			const total = pool.reduce((a, [e]) => a + e.weight, 0);
			let r = rng() * total;
			let pick = pool[0];
			for (const p of pool) {
				r -= p[0].weight;
				if (r <= 0) {
					pick = p;
					break;
				}
			}
			const [e, c] = pick;
			event = {
				id: e.id,
				country: c,
				q,
				deadline: q + e.days
			};
			cooldown[`ev:${e.id}`] = 6;
			out.news.push([
				"world",
				e.title(c).toUpperCase(),
				`${e.text(c)} Ответ — за президентом${e.days > 1 ? `, срок — ${e.days} квартала` : " в этом квартале"}.`,
				7
			]);
		}
	}
	out.relations = Object.fromEntries(NEIGHBOR_IDS.map((c) => [c, Math.round(rel[c] * 10) / 10]));
	Object.assign(out, {
		treaties,
		sanctions,
		cooldown,
		mobilized,
		calm,
		event
	});
	return out;
}
function peaceStep(s, decisions, difficulty, q) {
	const out = {
		impulses: [],
		news: [],
		talks: s.peaceTalks || null,
		treaty: s.treaty || null,
		returned: []
	};
	const held = heldAnnex(s);
	if (held.length && !(s.treaty && s.treaty.recognized)) out.impulses.push(makeImpulse("exportsGrowth", -.3, "Санкции за непризнанную границу", "fast", difficulty, "other"), makeImpulse("fdi", -1, "Непризнанная граница отпугивает инвесторов", "fast", difficulty, "other"));
	const talks = s.peaceTalks;
	if (!talks) return out;
	const terms = sanitizeTreaty(decisions.treaty, s);
	if (terms && terms.walkAway) {
		out.talks = null;
		out.news.push([
			"gov",
			"ПЕРЕГОВОРЫ С НОРЛАНДОМ ПРЕРВАНЫ",
			"Договора не будет: граница остаётся непризнанной, санкции — в силе, а в Норланде говорят о реванше всё громче.",
			8
		]);
		return out;
	}
	if (!terms || !terms.propose) {
		out.talks = {
			...talks,
			leverage: Math.max(0, talks.leverage - 2)
		};
		return out;
	}
	const cost = treatyCost(terms, s);
	if (cost > talks.leverage) {
		out.talks = {
			...talks,
			leverage: Math.max(0, talks.leverage - 2),
			attempts: (talks.attempts || 0) + 1,
			refused: {
				cost: Math.round(cost),
				q
			}
		};
		out.news.push([
			"gov",
			"НОРЛАНД ОТВЕРГ УСЛОВИЯ МИРА",
			`Делегация Норланда покинула зал: требования (${Math.round(cost)}) выше того, что позволяет нынешняя позиция страны (${Math.round(talks.leverage)}). Позиция тает с каждым кварталом.`,
			8
		]);
		return out;
	}
	out.talks = null;
	const kept = held.filter((id) => !terms.returned.includes(id));
	out.treaty = {
		q,
		recognized: terms.recognition,
		sanctions: terms.sanctions,
		reparations: terms.reparations,
		returned: terms.returned,
		kept
	};
	out.returned = terms.returned;
	out.impulses.push(makeImpulse("approvalPush", terms.returned.length || terms.reparations === "pay" ? -2 : 3, "Мирный договор с Норландом", "fast", difficulty, "other"), makeImpulse("tensionPush", -2, "Мирный договор", "fast", difficulty, "other"), makeImpulse("businessConfidence", 4, "Мирный договор", "default", difficulty, "other"));
	if (terms.recognition) out.impulses.push(makeImpulse("riskPremium", -.3, "Граница признана", "default", difficulty), makeImpulse("fdi", 6, "Граница признана", "default", difficulty, "other"), makeImpulse("exportsGrowth", 1.5, "Граница признана", "default", difficulty, "other"));
	if (terms.sanctions) out.impulses.push(makeImpulse("exportsGrowth", 3, "Санкции сняты", "default", difficulty, "other"), makeImpulse("importsGrowth", 2, "Санкции сняты", "default", difficulty, "other"), makeImpulse("capitalFlow", 12, "Санкции сняты", "default", difficulty), makeImpulse("fdi", 8, "Санкции сняты", "default", difficulty, "other"), makeImpulse("riskPremium", -.4, "Санкции сняты", "default", difficulty), makeImpulse("stockShock", 6, "Санкции сняты", "fast", difficulty));
	const rep = s.nominalGdp * .6 / 100;
	if (terms.reparations === "receive") out.impulses.push(sustainedImpulse("revenue", rep, 8, "Репарации Норланда"));
	if (terms.reparations === "pay") out.impulses.push(sustainedImpulse("revenue", -rep, 8, "Выплата репараций Норланду"));
	const parts = [
		terms.recognition ? `Норланд признаёт новую границу${kept.length ? ` — за страной остаются: ${kept.map((id) => regionById(id).name).join(", ")}` : ""}.` : "Граница остаётся непризнанной: это перемирие на бумаге, а не мир.",
		terms.sanctions ? "Норланд поддерживает снятие санкций — партнёры возвращаются." : "",
		terms.reparations === "receive" ? "Норланд выплатит репарации: около 0,6% ВВП в год два года." : terms.reparations === "pay" ? "Страна выплатит Норланду репарации: около 0,6% ВВП в год два года." : "",
		terms.returned.length ? `Норланду возвращаются: ${terms.returned.map((id) => regionById(id).name).join(", ")}.` : ""
	].filter(Boolean);
	out.news.push([
		"gov",
		"ПОДПИСАН МИРНЫЙ ДОГОВОР С НОРЛАНДОМ",
		parts.join(" "),
		10
	]);
	return out;
}
// src/lib/content/events.js
const EVENTS = [
	{
		id: "global_crisis",
		kind: "external",
		title: "Мировой экономический кризис",
		weight: 3,
		cooldown: 10,
		news: "Замедление мировой экономики ударило по внешнему спросу и настроениям инвесторов.",
		spread: [
			.4,
			.35,
			.25
		],
		build: () => [
			["exportsGrowth", -7],
			["investment", -4],
			["businessConfidence", -14],
			["consumerConfidence", -10],
			["financialStability", -8],
			["worldGdpGrowth", -1.8],
			["worldDemandIndex", -8],
			["capitalFlow", -18],
			["secIndustry", -9],
			["secResources", -7],
			["secBanks", -6],
			["stockShock", -13]
		]
	},
	{
		id: "oil_up",
		kind: "supply",
		title: "Рост мировых цен на сырьё",
		weight: 4,
		cooldown: 4,
		spread: [.6, .4],
		build: (s) => s.exports - s.imports >= 0 ? {
			news: "Рост цен на сырьё увеличил экспортную выручку и укрепил платёжный баланс.",
			list: [
				["exportsGrowth", 5],
				["commodityIndex", 10],
				["capitalFlow", 8],
				["secResources", 10],
				["secConsumer", 2]
			]
		} : {
			news: "Рост цен на сырьё поднял издержки производства и разогнал инфляцию предложения.",
			list: [
				["inflationSupply", 1.1],
				["commodityIndex", 10],
				["consumerConfidence", -5],
				["potentialShock", -.25],
				["secResources", 8],
				["secIndustry", -6],
				["secConsumer", -4]
			]
		}
	},
	{
		id: "commodity_down",
		kind: "supply",
		title: "Падение цен на сырьё",
		weight: 4,
		cooldown: 4,
		spread: [.6, .4],
		build: (s) => s.exports - s.imports >= 0 ? {
			news: "Падение цен на сырьё сократило экспортную выручку и ослабило платёжный баланс.",
			list: [
				["exportsGrowth", -5],
				["commodityIndex", -10],
				["capitalFlow", -7]
			]
		} : {
			news: "Падение цен на сырьё снизило издержки и ослабило инфляционное давление.",
			list: [
				["inflationSupply", -.8],
				["commodityIndex", -10],
				["consumerConfidence", 2]
			]
		}
	},
	{
		id: "supply_chain",
		kind: "supply",
		title: "Разрыв цепочек поставок",
		weight: 3,
		cooldown: 8,
		news: "Сбои поставок подняли издержки и сократили производственные возможности экономики.",
		spread: [
			.5,
			.3,
			.2
		],
		build: () => [
			["inflationSupply", 2],
			["potentialShock", -.8],
			["productivity", -.6],
			["businessConfidence", -7],
			["investment", -4.5],
			["consumption", -1.8],
			["exportsGrowth", -3.5],
			["secIndustry", -10],
			["secConsumer", -5],
			["secResources", 5],
			["stockShock", -6]
		]
	},
	{
		id: "financial_crisis",
		kind: "financial",
		title: "Глобальный финансовый кризис",
		weight: 2,
		cooldown: 12,
		news: "Глобальная нестабильность спровоцировала бегство капитала из рискованных активов.",
		spread: [
			.5,
			.3,
			.2
		],
		build: () => [
			["financialStability", -16],
			["fdi", -25],
			["capitalFlow", -35],
			["riskPremium", 1.2],
			["businessConfidence", -10],
			["stockShock", -18],
			["secBanks", -14],
			["secReit", -11],
			["secIndustry", -7],
			["investment", -3]
		]
	},
	{
		id: "bank_run",
		kind: "financial",
		title: "Паника вкладчиков",
		weight: 2,
		cooldown: 10,
		eligible: (s) => s.financialStability < 58 || s.bankNPL > 6,
		weightFn: (s) => s.financialStability < 42 ? 5 : s.financialStability < 58 ? 2.5 : 0,
		news: "Отток депозитов обрушил ликвидность банков и парализовал кредитование.",
		spread: [.7, .3],
		build: () => [
			["bankLiquidity", -22],
			["bankNPL", 1.2],
			["financialStability", -18],
			["investment", -4],
			["secBanks", -16],
			["secReit", -9],
			["stockShock", -9]
		]
	},
	{
		id: "deflation_risk",
		kind: "demand",
		title: "Провал внутреннего спроса",
		weight: 2,
		cooldown: 8,
		eligible: (s) => s.inflation < 2.5,
		news: "Слабый спрос и осторожность домохозяйств создали риск дефляционной спирали.",
		spread: [.5, .5],
		build: () => [
			["consumption", -2.2],
			["investment", -2],
			["consumerConfidence", -8],
			["inflationSupply", -.6]
		]
	},
	{
		id: "pandemic",
		kind: "supply",
		title: "Пандемия",
		weight: 1,
		cooldown: 20,
		news: "Вспышка заболевания одновременно сократила спрос и производственные возможности.",
		spread: [
			.5,
			.3,
			.2
		],
		build: () => [
			["consumption", -6],
			["investment", -6],
			["unemployment", 1.6],
			["potentialShock", -1.2],
			["consumerConfidence", -16],
			["worldGdpGrowth", -1.4],
			["inflationSupply", .8],
			["stockShock", -15],
			["secConsumer", -10],
			["secReit", -6]
		]
	},
	{
		id: "war",
		kind: "external",
		title: "Начало войны",
		weight: .6,
		cooldown: 28,
		eligible: (s) => !((s.warQuartersLeft || 0) > 0),
		weightFn: (s) => .6 * deshtWarMultiplier(s),
		spread: [
			.4,
			.3,
			.2,
			.1
		],
		build: (s) => {
			const defShare = s.budgetShares ? s.budgetShares.defense : CONFIG.initial.budgetShares.defense;
			const mult = clamp(1 - Math.max(0, defShare - CONFIG.initial.budgetShares.defense) * .025, .35, 1);
			return {
				news: `Началась война. ${mult < .7 ? "Заранее высокие расходы на оборону смягчили удар по экономике — армия и логистика были готовы." : "Низкие расходы на оборону обернулись более тяжёлым ударом — тыл оказался не готов."} Война носит оборонительный характер: союзники открывают кредитные линии и наращивают закупки — приходит иностранная помощь.`,
				warType: "defensive",
				list: [
					["exportsGrowth", -8 * mult],
					["importsGrowth", -6 * mult],
					["investment", -7 * mult],
					["businessConfidence", -18 * mult],
					["consumerConfidence", -12 * mult],
					["inflationSupply", 1.6 * mult],
					["capitalFlow", -30 * mult],
					["fdi", -22 * mult],
					["riskPremium", 1.4 * mult],
					["potentialShock", -1 * mult],
					["worldDemandIndex", -6 * mult],
					["stockShock", -20 * mult],
					["secIndustry", -8 * mult],
					["secConsumer", -10 * mult],
					["secReit", -9 * mult],
					...[
						["capitalFlow", 14],
						["fdi", 9],
						["exportsGrowth", 2.5],
						["riskPremium", -.5],
						["worldDemandIndex", 2]
					]
				]
			};
		}
	},
	{
		id: "geopolitical",
		kind: "external",
		title: "Геополитический кризис",
		weight: 2,
		cooldown: 10,
		news: "Геополитическая напряжённость встревожила инвесторов и подняла издержки.",
		spread: [.5, .5],
		build: () => [
			["businessConfidence", -10],
			["fdi", -15],
			["capitalFlow", -22],
			["riskPremium", .9],
			["inflationSupply", .7],
			["stockShock", -8],
			["secResources", 4]
		]
	},
	{
		id: "sanctions",
		kind: "external",
		title: "Введение санкций",
		weight: 1.5,
		cooldown: 16,
		news: "Внешние ограничения нарушили торговые и финансовые потоки.",
		spread: [
			.4,
			.35,
			.25
		],
		build: () => [
			["exportsGrowth", -7],
			["importsGrowth", -5],
			["capitalFlow", -30],
			["fdi", -18],
			["inflationSupply", 1.1],
			["potentialShock", -.7],
			["riskPremium", 1],
			["stockShock", -11],
			["secIndustry", -8]
		]
	},
	{
		id: "global_rate_hike",
		kind: "external",
		title: "Рост мировых процентных ставок",
		weight: 3,
		cooldown: 6,
		news: "Ужесточение политики крупнейших центробанков спровоцировало отток капитала.",
		spread: [.6, .4],
		build: () => [
			["worldRate", 1.4],
			["capitalFlow", -20],
			["fdi", -8],
			["secReit", -10],
			["secBanks", -5]
		]
	},
	{
		id: "capital_inflow",
		kind: "financial",
		title: "Резкий приток капитала",
		weight: 3,
		cooldown: 6,
		news: "Инвесторы нарастили вложения — дешёвые деньги хлынули в экономику.",
		spread: [.6, .4],
		build: () => [
			["capitalFlow", 28],
			["fdi", 15],
			["financialStability", -3],
			["investment", 1.5],
			["secBanks", 7],
			["secReit", 8],
			["secIndustry", 4],
			["stockShock", 6]
		]
	},
	{
		id: "tech_breakthrough",
		kind: "structural",
		title: "Технологический скачок",
		weight: 2,
		cooldown: 12,
		news: "Внедрение новых технологий повысило совокупную производительность.",
		spread: [
			.3,
			.4,
			.3
		],
		build: () => [
			["productivity", 1.6],
			["businessConfidence", 8],
			["investment", 2],
			["potentialShock", .5],
			["secIndustry", 11],
			["secConsumer", 4],
			["stockShock", 7]
		]
	},
	{
		id: "demographic",
		kind: "structural",
		title: "Демографический сдвиг",
		weight: 1,
		cooldown: 24,
		news: "Старение населения сжимает рабочую силу и давит на бюджет.",
		spread: [
			.3,
			.3,
			.4
		],
		build: () => [
			["laborForce", -.8],
			["wageGrowth", .7],
			["transfersPressure", 1],
			["rStar", -.25]
		]
	},
	{
		id: "consumer_boom",
		kind: "demand",
		title: "Потребительский бум",
		weight: 3,
		cooldown: 6,
		news: "Домохозяйства резко нарастили расходы и спрос на кредит.",
		spread: [.6, .4],
		build: () => [
			["consumption", 2.5],
			["consumerConfidence", 9],
			["creditDemand", 3],
			["secConsumer", 9],
			["secReit", 6]
		]
	},
	{
		id: "harvest_fail",
		kind: "supply",
		title: "Неурожай и рост цен на продовольствие",
		weight: 3,
		cooldown: 6,
		news: "Плохой урожай поднял продовольственные цены — удар по реальным доходам.",
		spread: [.7, .3],
		build: () => [
			["inflationSupply", 1.4],
			["consumerConfidence", -6],
			["consumption", -.8]
		]
	}
];
const CHANNEL_HEADLINE = {
	consumption: "gdpGrowth",
	investment: "gdpGrowth",
	exportsGrowth: "gdpGrowth",
	importsGrowth: "gdpGrowth",
	creditDemand: "banking",
	inflationSupply: "inflation",
	vatPrices: "inflation",
	exchangeRate: "exchangeRate",
	capitalFlow: "exchangeRate",
	riskPremium: "exchangeRate",
	revenue: "budget",
	transfersPressure: "budget",
	unemployment: "unemployment",
	wageGrowth: "unemployment",
	laborForce: "unemployment",
	financialStability: "banking",
	bankNPL: "banking",
	bankLiquidity: "banking",
	bankCapital: "banking",
	productivity: "potential",
	potentialShock: "potential",
	infrastructureIndex: "potential",
	rStar: "potential",
	secBanks: "banking",
	secIndustry: "banking",
	secConsumer: "banking",
	secResources: "banking",
	secReit: "banking",
	stockShock: "banking",
	govInvestmentPush: "gdpGrowth"
};
const headlineFor = (channel) => CHANNEL_HEADLINE[channel] || "other";
function spreadOf(kind, difficulty) {
	if (kind === "slow") return CONFIG.slowSpread[difficulty];
	if (kind === "fast") return [1];
	return CONFIG.lagSpread[difficulty];
}
function makeImpulse(channel, amount, reasonText, spreadKind, difficulty, headline) {
	const pattern = spreadOf(spreadKind, difficulty);
	return {
		id: uid(),
		channel,
		reasonText,
		headline: headline || headlineFor(channel),
		values: pattern.map((f) => amount * f),
		idx: 0
	};
}
function sustainedImpulse(channel, perQuarter, quarters, reasonText, headline) {
	return {
		id: uid(),
		channel,
		reasonText,
		headline: headline || headlineFor(channel),
		values: Array.from({ length: Math.max(1, quarters) }, () => perQuarter),
		idx: 0
	};
}
function taperedImpulse(channel, values, reasonText, headline) {
	return {
		id: uid(),
		channel,
		reasonText,
		headline: headline || headlineFor(channel),
		values,
		idx: 0
	};
}
function pickEvent(state, eventCooldowns) {
	const pool = EVENTS.filter((e) => {
		if ((eventCooldowns[e.id] || 0) > 0) return false;
		if (e.eligible && !e.eligible(state)) return false;
		return true;
	});
	if (!pool.length) return null;
	const weights = pool.map((e) => e.weightFn ? e.weightFn(state) : e.weight);
	const total = weights.reduce((a, b) => a + b, 0);
	if (total <= 0) return null;
	let r = rng() * total;
	for (let i = 0; i < pool.length; i++) {
		r -= weights[i];
		if (r <= 0) return pool[i];
	}
	return pool[pool.length - 1];
}
function buildEventImpulses(evt, state) {
	const resolved = evt.build(state);
	const list = Array.isArray(resolved) ? resolved : resolved.list;
	const news = Array.isArray(resolved) ? evt.news : resolved.news;
	const warType = Array.isArray(resolved) ? null : resolved.warType || null;
	return {
		impulses: list.map(([channel, amount]) => ({
			id: uid(),
			channel,
			reasonText: `Событие: ${evt.title}`,
			headline: headlineFor(channel),
			values: evt.spread.map((f) => amount * f),
			idx: 0
		})),
		news,
		warType
	};
}
function tickImpulses(queue) {
	const deltas = {};
	const contributions = [];
	const nextQueue = [];
	for (const imp of queue) {
		const amt = imp.values[imp.idx] || 0;
		deltas[imp.channel] = (deltas[imp.channel] || 0) + amt;
		if (Math.abs(amt) > 1e-4 && imp.headline && imp.headline !== "other") contributions.push({
			reasonText: imp.reasonText,
			headline: imp.headline,
			amount: amt,
			channel: imp.channel
		});
		const nextIdx = imp.idx + 1;
		if (nextIdx < imp.values.length) nextQueue.push({
			...imp,
			idx: nextIdx
		});
	}
	return {
		deltas,
		contributions,
		nextQueue
	};
}
// src/lib/content/press.js
const PRESS_QUESTIONS = [
	{
		id: "growth",
		shortLabel: "ОБ ИТОГАХ КВАРТАЛА",
		when: () => true,
		prompt: "Как вы оцениваете экономические результаты квартала?",
		promptHard: "Какими достижениями отмечен завершившийся квартал?",
		options: [
			{
				id: "spin",
				label: "Показать результаты в лучшем свете",
				quote: "Мы видим уверенный прогресс по всем ключевым направлениям.",
				build: (s, d) => ({ impulses: [makeImpulse("approvalPush", 2.5, "Пресс-конференция: оптимистичный тон", "fast", d, "other"), makeImpulse("govTrust", -2, "Пресс-конференция: приукрашенные цифры", "fast", d, "other")] })
			},
			{
				id: "honest",
				label: "Признать проблемы честно",
				quote: "Есть реальные сложности, и мы не собираемся их замалчивать.",
				build: (s, d) => ({ impulses: [makeImpulse("govTrust", 3, "Пресс-конференция: честное признание проблем", "fast", d, "other"), makeImpulse("approvalPush", -1, "Пресс-конференция: неприятная правда", "fast", d, "other")] })
			},
			{
				id: "deflect",
				label: "Уйти от прямого ответа",
				quote: "Экономика — это сложная система, нельзя всё сводить к одной цифре.",
				build: (s, d) => ({ impulses: [makeImpulse("govTrust", -1.5, "Пресс-конференция: уклончивый ответ", "fast", d, "other")] })
			}
		]
	},
	{
		id: "opposition",
		shortLabel: "ОБ ОБВИНЕНИЯХ ОППОЗИЦИИ",
		shortLabelHard: "О ЗАРУБЕЖНЫХ ОЦЕНКАХ",
		when: () => true,
		prompt: "Оппозиция называет вашу экономическую политику провальной — ваш ответ?",
		promptHard: "Зарубежные издания называют экономический курс страны провальным. Как вы прокомментируете эти публикации?",
		options: [
			{
				id: "attack",
				label: "Перейти в контратаку",
				quote: "Оппозиция предлагает лишь популизм без единой цифры расчётов.",
				quoteHard: "За этими публикациями стоят те, кому наш курс мешает. Ни одной цифры расчётов они не предъявили.",
				build: (s, d) => ({ impulses: [makeImpulse("approvalPush", 2, "Пресс-конференция: жёсткий ответ оппозиции", "fast", d, "other"), makeImpulse("tensionPush", 3, "Пресс-конференция: обострение риторики", "fast", d, "other")] })
			},
			{
				id: "engage",
				label: "Признать часть критики обоснованной",
				quote: "В критике есть здравое зерно, и мы готовы это обсуждать.",
				quoteHard: "Даже в недружественных оценках встречается полезное, и мы это учитываем в работе.",
				build: (s, d) => ({ impulses: [makeImpulse("govTrust", 2.5, "Пресс-конференция: готовность к диалогу", "fast", d, "other"), makeImpulse("tensionPush", -2, "Пресс-конференция: снижение накала", "fast", d, "other")] })
			},
			{
				id: "ignore",
				label: "Проигнорировать вопрос",
				quote: "Мы сосредоточены на работе, а не на политических дебатах.",
				quoteHard: "Мы сосредоточены на работе, а не на чужих публикациях.",
				build: (s, d) => ({ impulses: [makeImpulse("approvalPush", -1, "Пресс-конференция: отказ отвечать критикам", "fast", d, "other")] })
			}
		]
	},
	{
		id: "inflation",
		shortLabel: "ОБ ИНФЛЯЦИИ",
		when: (s) => s.inflation > (s.inflationTarget || 4) + 2,
		prompt: "Цены снова растут быстрее обещанного — как вы это объясните?",
		promptHard: "Отдельные группы товаров подорожали заметнее прочих. Что делается для сдерживания цен?",
		options: [
			{
				id: "blame_external",
				label: "Списать на внешние факторы",
				quote: "Инфляция ускоряется во всём мире, мы не исключение.",
				build: (s, d) => ({ impulses: [makeImpulse("approvalPush", 1.5, "Пресс-конференция: инфляция как внешний шок", "fast", d, "other"), makeImpulse("govTrust", -2.5, "Пресс-конференция: перекладывание ответственности", "fast", d, "other")] })
			},
			{
				id: "own_it",
				label: "Взять ответственность на себя",
				quote: "Часть решений оказалась ошибочной, и мы это исправляем.",
				build: (s, d) => ({ impulses: [makeImpulse("govTrust", 3.5, "Пресс-конференция: ответственность за инфляцию", "fast", d, "other"), makeImpulse("approvalPush", -2, "Пресс-конференция: признание ошибки", "fast", d, "other")] })
			},
			{
				id: "promise",
				label: "Пообещать скорое улучшение",
				quote: "Уже в следующих кварталах инфляция пойдёт на спад.",
				build: (s, d) => ({ impulses: [makeImpulse("approvalPush", 2, "Пресс-конференция: обещание скорого улучшения", "fast", d, "other"), makeImpulse("govTrust", -1, "Пресс-конференция: невыполнимое обещание", "default", d, "other")] })
			}
		]
	},
	{
		id: "unemployment",
		shortLabel: "О БЕЗРАБОТИЦЕ",
		when: (s) => s.unemployment > s.nairu + 1.2,
		prompt: "Люди теряют работу — что вы скажете тем, кто остался без дохода?",
		promptHard: "Часть предприятий проводит оптимизацию штата. Какая поддержка предусмотрена для работников?",
		options: [
			{
				id: "sympathy",
				label: "Выразить сочувствие и пообещать поддержку",
				quote: "Мы разделяем эту боль и расширяем программы поддержки.",
				build: (s, d) => ({ impulses: [makeImpulse("consumerConfidence", 2.5, "Пресс-конференция: сочувствие безработным", "fast", d, "other"), makeImpulse("govTrust", 1.5, "Пресс-конференция: сочувствие безработным", "fast", d, "other")] })
			},
			{
				id: "structural",
				label: "Назвать это неизбежной структурной перестройкой",
				quote: "Экономика проходит через болезненную, но необходимую перестройку.",
				build: (s, d) => ({ impulses: [makeImpulse("govTrust", -2, "Пресс-конференция: безработица названа неизбежной", "fast", d, "other"), makeImpulse("approvalPush", -1.5, "Пресс-конференция: холодный ответ безработным", "fast", d, "other")] })
			},
			{
				id: "minimize",
				label: "Преуменьшить масштаб проблемы",
				quote: "Цифры безработицы не так тревожны, как их представляют.",
				build: (s, d) => ({ impulses: [makeImpulse("govTrust", -3, "Пресс-конференция: преуменьшение безработицы", "fast", d, "other"), makeImpulse("consumerConfidence", -2, "Пресс-конференция: преуменьшение безработицы", "fast", d, "other")] })
			}
		]
	},
	{
		id: "debt",
		shortLabel: "О ГОСДОЛГЕ",
		when: (s) => s.debtToGdp > 70,
		prompt: "Госдолг продолжает расти — вас не пугает эта цифра?",
		promptHard: "Показатель государственного долга растёт. Насколько устойчива финансовая система государства?",
		options: [
			{
				id: "reassure",
				label: "Заверить, что долг под контролем",
				quote: "Долговая нагрузка полностью управляема, поводов для паники нет.",
				build: (s, d) => ({ impulses: [makeImpulse("approvalPush", 1.5, "Пресс-конференция: заверения по долгу", "fast", d, "other"), makeImpulse("riskPremium", .15, "Пресс-конференция: рынок не поверил заверениям по долгу", "default", d)] })
			},
			{
				id: "plan",
				label: "Изложить конкретный план консолидации",
				quote: "У нас есть чёткий график снижения долговой нагрузки.",
				build: (s, d) => ({ impulses: [makeImpulse("govTrust", 3, "Пресс-конференция: план консолидации долга", "fast", d, "other"), makeImpulse("riskPremium", -.2, "Пресс-конференция: рынок поверил в план консолидации", "default", d)] })
			},
			{
				id: "shrug",
				label: "Сказать, что так живут многие страны",
				quote: "Уровень нашего долга сопоставим со многими развитыми странами.",
				build: (s, d) => ({ impulses: [makeImpulse("govTrust", -2, "Пресс-конференция: долг списан на общемировую практику", "fast", d, "other")] })
			}
		]
	}
];
const PRESS_SPEAKER_ORDER = [
	"president",
	"ministry_finance",
	"central_bank"
];
function pressSpeakerSeat(occupied) {
	return PRESS_SPEAKER_ORDER.find((seat) => !!(occupied && occupied[seat])) || null;
}
const PRESS_OPTION_IDS = new Set(PRESS_QUESTIONS.flatMap((q) => q.options.map((o) => o.id)));
function pickPressQuestion(s, quarterIndex) {
	const eligible = PRESS_QUESTIONS.filter((q) => !q.when || q.when(s));
	if (!eligible.length) return null;
	const q = eligible[(quarterIndex % eligible.length + eligible.length) % eligible.length];
	if (!pressControlled(s)) return q;
	return {
		...q,
		shortLabel: q.shortLabelHard || q.shortLabel,
		prompt: q.promptHard || q.prompt,
		options: q.options.map((o) => o.quoteHard ? {
			...o,
			quote: o.quoteHard
		} : o)
	};
}
// src/lib/model/guidance.js
const GUIDANCE_LABEL = {
	cut: "снижать",
	hold: "держать",
	hike: "повышать"
};
const HORIZON = 2;
function guidanceBreach(dir, delta) {
	if (dir === "hold") return Math.max(0, Math.abs(delta) - .25);
	if (dir === "cut") return delta > .01 ? delta + .25 : 0;
	if (dir === "hike") return delta < -.01 ? -delta + .25 : 0;
	return 0;
}
function guidanceStep(s, keyRate, pick) {
	const cur = s.guidance && s.guidance.left > 0 ? s.guidance : null;
	const cred = clamp(Number.isFinite(s.cbCredibility) ? s.cbCredibility : 60, 0, 100) / 100;
	const delta = keyRate - (Number.isFinite(s.keyRate) ? s.keyRate : keyRate);
	let credDelta = 0;
	const news = [];
	if (cur) {
		const breach = guidanceBreach(cur.dir, delta);
		if (breach > 0) {
			credDelta -= Math.min(12, 5 * breach);
			news.push([
				"cb",
				"ЦБ НАРУШИЛ СОБСТВЕННОЕ ОБЕЩАНИЕ",
				`Обещали ${GUIDANCE_LABEL[cur.dir]} ставку, а сдвинули её на ${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(2).replace(".", ",")} п.п. Рынок запомнит: следующему слову ЦБ поверят меньше.`,
				8
			]);
		} else credDelta += .6;
	}
	let next = cur ? {
		...cur,
		left: cur.left - 1
	} : null;
	if (pick === "none" && cur && cur.left > 1) {
		credDelta -= 1.5;
		next = null;
		news.push([
			"cb",
			"ЦБ ОТОЗВАЛ ОРИЕНТИР ПО СТАВКЕ",
			"Обещание сняли раньше срока — рынок воспринял это как неуверенность.",
			5
		]);
	} else if (pick && pick !== "none" && (!cur || cur.dir !== pick || cur.left <= 1)) {
		next = {
			dir: pick,
			left: HORIZON,
			fromRate: keyRate
		};
		if (!cur || cur.dir !== pick) news.push([
			"cb",
			`ЦБ: БУДЕМ ${GUIDANCE_LABEL[pick].toUpperCase()} СТАВКУ`,
			`Ориентир на два квартала. Рынок верит ЦБ на ${Math.round(cred * 100)} из 100 — и уже закладывает путь в ставки по кредитам и доходности облигаций.`,
			6
		]);
	}
	if (next && next.left <= 0) next = null;
	const dir = next ? next.dir : null;
	const bias = (dir === "hike" ? .5 : dir === "cut" ? -.5 : 0) * cred;
	const expDelta = dir === "hike" ? -.15 * cred : dir === "cut" ? .1 * cred : dir === "hold" ? -.03 * cred : 0;
	return {
		next,
		bias,
		expDelta,
		credDelta,
		news
	};
}
// src/lib/model/firms.js
const FIRMS = [
	{
		id: "kolos",
		name: "Хлебный дом «Колос»",
		sector: "Продукты",
		regions: ["agri", "capital"],
		base: 60,
		k: {
			demand: .35,
			rate: .4,
			tax: .6,
			fx: -.4,
			world: 0
		}
	},
	{
		id: "severoles",
		name: "Северолес",
		sector: "Лес и мебель",
		regions: ["periphery", "port"],
		base: 55,
		k: {
			demand: .9,
			rate: 1.1,
			tax: .6,
			fx: .4,
			world: .6
		}
	},
	{
		id: "stal",
		name: "Стальной союз",
		sector: "Металлургия",
		regions: ["industry", "mining"],
		base: 52,
		k: {
			demand: 1.3,
			rate: .8,
			tax: .8,
			fx: .7,
			world: 1
		}
	},
	{
		id: "westra",
		name: "Вестравский ритейл",
		sector: "Ритейл (иностранный)",
		regions: ["capital", "finance"],
		foreign: true,
		base: 57,
		k: {
			demand: 1,
			rate: .5,
			tax: .5,
			fx: -.9,
			world: 0
		}
	}
];
const initialFirms = () => Object.fromEntries(FIRMS.map((f) => [f.id, {
	health: 60,
	mode: "steady"
}]));
function firmTarget(f, x) {
	const score = f.k.demand * 4 * (x.gdpGrowth - 2) - f.k.rate * 3 * (x.rateGap || 0) - f.k.tax * .9 * (x.profitTaxRate - 20) + f.k.fx * .25 * clamp(x.fxDeprAnnual, -20, 30) + f.k.world * .8 * clamp(x.exportsGrowth, -10, 10) - (x.atWar ? 6 : 0);
	const room = score >= 0 ? 97 - f.base : f.base - 3;
	return f.base + room * Math.tanh(score / room);
}
function firmsStep(prev, x) {
	const p = prev && typeof prev === "object" ? prev : initialFirms();
	const out = {};
	const events = [];
	const regionShift = {};
	let invest = 0;
	FIRMS.forEach((f) => {
		const cur = p[f.id] || {
			health: 60,
			mode: "steady"
		};
		if (f.foreign && x.sanctions) {
			out[f.id] = {
				health: 0,
				mode: "gone"
			};
			if (cur.mode !== "gone") events.push({
				firm: f,
				kind: "gone"
			});
			return;
		}
		const target = firmTarget(f, x);
		const health = clamp(cur.health + .3 * (target - cur.health), 0, 100);
		const mode = health < 30 ? "cutting" : health > 70 ? "expanding" : "steady";
		if (mode !== cur.mode && cur.mode !== "gone") events.push({
			firm: f,
			kind: mode
		});
		if (cur.mode === "gone") events.push({
			firm: f,
			kind: "back"
		});
		if (mode === "cutting") {
			invest -= .15;
			f.regions.forEach((r) => {
				regionShift[r] = (regionShift[r] || 0) + 4;
			});
		}
		if (mode === "expanding") {
			invest += .25;
			f.regions.forEach((r) => {
				regionShift[r] = (regionShift[r] || 0) - 2;
			});
		}
		out[f.id] = {
			health,
			mode
		};
	});
	return {
		firms: out,
		events,
		investmentPush: invest,
		regionShift
	};
}
// src/lib/model/fiscal.js
const TAX_REF = {
	income: 13,
	wedge: 32,
	profit: 18,
	vat: 16,
	excise: 10,
	capital: 12
};
function complianceFor(rate, ref, sens, shadowShare) {
	const excess = Math.max(0, rate - ref);
	const relief = Math.max(0, ref - rate) * .004;
	const c = (1 - shadowShare / 100 + relief) * (1 - sens * Math.pow(excess, 1.35) / 100);
	return clamp(c, .2, .99);
}
function taxBases(s) {
	const nom = Math.max(1, s.nominalGdp);
	const cyc = 1 + .6 * (s.outputGap / 100);
	const employmentEffect = (100 - s.unemployment) / (100 - CONFIG.target.nairu);
	return {
		labor: nom * CONFIG.shares.wageBill * cyc * employmentEffect,
		profit: nom * CONFIG.shares.profits * Math.max(.35, 1 + 1.8 * (s.outputGap / 100)),
		consumption: Math.max(1, s.consumption * s.priceLevel / 100),
		capital: nom * CONFIG.shares.capitalIncome * cyc,
		nominal: nom
	};
}
function computeRevenue(s, d) {
	const B = taxBases(s);
	const sh = s.shadowShare;
	const income = d.incomeTaxRate / 100 * B.labor * complianceFor(d.incomeTaxRate, TAX_REF.income, .9, sh);
	const social = d.socialContribRate / 100 * B.labor * complianceFor(d.socialContribRate + d.incomeTaxRate, TAX_REF.wedge, .8, sh);
	const profit = d.profitTaxRate / 100 * B.profit * complianceFor(d.profitTaxRate, TAX_REF.profit, 1.5, sh);
	const vat = d.vatRate / 100 * B.consumption * .72 * complianceFor(d.vatRate, TAX_REF.vat, 1.1, sh);
	const excise = d.exciseRate / 100 * B.consumption * .26 * complianceFor(d.exciseRate, TAX_REF.excise, .7, sh);
	const capital = d.capitalTaxRate / 100 * B.capital * complianceFor(d.capitalTaxRate, TAX_REF.capital, 2.2, sh);
	const nonTax = CONFIG.shares.nonTaxRevenue * B.nominal;
	return {
		income,
		social,
		profit,
		vat,
		excise,
		capital,
		nonTax,
		total: income + social + profit + vat + excise + capital + nonTax,
		bases: B
	};
}
const taxWedge = (d) => d.incomeTaxRate + d.socialContribRate * .7 + d.vatRate * .35;
function potentialFrom(capitalStock, laborForce, nairu, humanCapital, productivity, infraIndex, tfpScale, scar) {
	const alpha = CONFIG.prod.alpha;
	const L = Math.max(1, laborForce * (1 - nairu / 100) * (humanCapital / 100));
	const A = tfpScale * (productivity / 100);
	const infraBoost = 1 + .18 * (infraIndex - 100) / 100;
	return A * Math.pow(Math.max(1, capitalStock), alpha) * Math.pow(L, 1 - alpha) * infraBoost * (1 + scar / 100);
}
const STOCK_NORM = (() => {
	const I = CONFIG.initial;
	const earn0 = CONFIG.shares.profits * I.gdp * (1 - I.profitTaxRate / 100);
	const y10 = I.keyRate + 1.5;
	const erp0 = 3.2;
	const growth0 = .62 * (2.3 + I.inflationExpectations);
	return earn0 * (100 / Math.max(1, y10 + erp0 - growth0)) / 1e3;
})();
const TFP_SCALE = (() => {
	const I = CONFIG.initial;
	const alpha = CONFIG.prod.alpha;
	const L = I.laborForce * (1 - I.nairu / 100) * (I.humanCapitalIndex / 100);
	return I.gdp / (Math.pow(I.capitalStock, alpha) * Math.pow(L, 1 - alpha));
})();
function computeScores(x) {
	const T = CONFIG.target;
	const tgt = Number.isFinite(x.inflationTarget) ? x.inflationTarget : T.inflation;
	const interestToRevenue = x.interestPayment / Math.max(1, x.govRevenue) * 100;
	const reserveCover = x.reserves / Math.max(1, x.imports / 4) * 3;
	const inflDev = Math.abs(x.inflation - tgt);
	const scoreStability = clamp(72 + .35 * (x.cbCredibility - 60) + (inflDev < 1 ? 4 : 0) - 8.5 * inflDev - 7 * Math.abs(x.inflationExpectations - tgt) - 3.2 * Math.max(0, Math.abs(x.outputGap) - 1), 0, 100);
	const scoreWelfare = clamp(52 + 7 * (x.gdpGrowth - 1.5) - 5.5 * (x.unemployment - x.nairu) + .22 * (x.consumerConfidence - 55) - 3.2 * Math.max(0, x.inflation - tgt) + .12 * (x.humanCapitalIndex - 100), 0, 100);
	const scoreFinancial = clamp(100 - .75 * x.bankingRisk - 2.2 * Math.max(0, x.creditGap) - 3.2 * Math.max(0, x.capitalRequirement + 1 - x.bankCapitalAdequacy) - .45 * x.currencyRisk + .06 * Math.min(100, reserveCover * 10), 0, 100);
	const scoreFiscal = clamp(100 - .75 * Math.max(0, x.debtToGdp - 45) - 5.5 * Math.max(0, -x.budgetBalancePctGdp - 2) - 1.4 * Math.max(0, interestToRevenue - 8) - .6 * Math.max(0, x.shadowShare - 14), 0, 100);
	const scorePotential = clamp(48 + 13 * (x.potentialGrowth - 2) + .3 * (x.humanCapitalIndex - 100) + .22 * (x.infrastructureIndex - 100) + .3 * (x.productivity - 100) - 5 * Math.max(0, x.nairu - T.nairu), 0, 100);
	return {
		scoreStability,
		scoreWelfare,
		scoreFinancial,
		scoreFiscal,
		scorePotential,
		wellbeing: clamp(.22 * scoreStability + .3 * scoreWelfare + .16 * scoreFinancial + .16 * scoreFiscal + .16 * scorePotential, 0, 100)
	};
}
// src/lib/politics/elections.js
const round1 = (v) => Math.round(v * 10) / 10;
const PROMISE_POOL = [
	{
		id: "inflation_tame",
		label: "Обуздать инфляцию",
		target: (s) => round1(s.inflationTarget + 1),
		metric: (e) => e.inflation,
		direction: "below",
		describe: (t) => `Инфляция не выше ${fmt1(t)}% к выборам`
	},
	{
		id: "jobs_for_all",
		label: "Работа для всех",
		target: (s) => round1(s.nairu + 1),
		metric: (e) => e.unemployment,
		direction: "below",
		describe: (t) => `Безработица не выше ${fmt1(t)}% к выборам`
	},
	{
		id: "debt_discipline",
		label: "Не наращивать долг",
		target: (s) => round1(s.debtToGdp),
		metric: (e) => e.debtToGdp,
		direction: "below",
		describe: (t) => `Госдолг не выше ${fmt1(t)}% ВВП — уровня на начало срока`
	},
	{
		id: "growth_promise",
		label: "Обеспечить рост",
		target: () => 4,
		baseline: (s) => s.gdp,
		metric: (e, base) => (e.gdp / base - 1) * 100,
		direction: "above",
		describe: (t) => `Реальный ВВП вырастет минимум на ${fmt1(t)}% за срок`
	},
	{
		id: "strong_currency",
		label: "Крепкая валюта",
		target: () => 15,
		baseline: (s) => s.exchangeRate,
		metric: (e, base) => (e.exchangeRate / base - 1) * 100,
		direction: "below",
		describe: (t) => `Курс не ослабнет больше чем на ${fmt1(t)}% за срок`
	},
	{
		id: "budget_control",
		label: "Бюджет под контролем",
		target: () => 3,
		metric: (e) => -e.budgetBalancePctGdp,
		direction: "below",
		describe: (t) => `Дефицит бюджета не больше ${fmt1(t)}% ВВП к выборам`
	},
	{
		id: "living_standards_promise",
		label: "Повысить уровень жизни",
		target: (s) => round1(s.wellbeing),
		metric: (e) => e.wellbeing,
		direction: "above",
		describe: (t) => `Благополучие не ниже ${fmt1(t)} — уровня на начало срока (показатель в шапке)`
	},
	{
		id: "reserves_promise",
		label: "Сохранить резервы",
		target: (s) => Math.round(s.reserves * .8),
		metric: (e) => e.reserves,
		direction: "above",
		describe: (t) => `Резервы не ниже ${fmtMoney(t)} — не менее 80% уровня на начало срока`
	}
];
function pickPromises(startEconomy, count = 3) {
	const pool = [...PROMISE_POOL];
	const picked = [];
	while (picked.length < count && pool.length) {
		const i = Math.floor(rng() * pool.length);
		picked.push(pool.splice(i, 1)[0]);
	}
	return picked.map((p) => {
		const target = p.target(startEconomy);
		return {
			id: p.id,
			label: p.label,
			target,
			baseline: p.baseline ? p.baseline(startEconomy) : null,
			text: p.describe(target)
		};
	});
}
function evaluatePromise(promise, economy) {
	const def = PROMISE_POOL.find((p) => p.id === promise.id);
	if (!def) return {
		met: true,
		value: null
	};
	const value = def.metric(economy, promise.baseline);
	return {
		met: def.direction === "below" ? value <= promise.target : value >= promise.target,
		value,
		direction: def.direction
	};
}
const CAMPAIGN_COST = .04;
const campaignOpen = (s) => (s.politicalRegime || "democracy") === "democracy" || s.politicalRegime === "crisis";
function persuadability(share) {
	const m = Math.abs(share - 50);
	return m < 4 ? 1 : m < 8 ? .55 : .2;
}
const campaignBonus = (points, share) => 1.6 * Math.sqrt(Math.max(0, points || 0)) * persuadability(share);
const swingLabel = (share) => {
	const m = share - 50;
	if (Math.abs(m) < 4) return "колеблется";
	if (Math.abs(m) < 8) return m > 0 ? "склоняется к власти" : "склоняется к оппозиции";
	return m > 0 ? "надёжная" : "потеряна";
};
const CLOSED_POLL_MARGIN = {
	authoritarian: 5,
	totalitarian: 8
};
function electionForecast(s, extraPlan) {
	const toVote = Number.isFinite(s.quartersToElection) ? s.quartersToElection : 16;
	const closed = CLOSED_POLL_MARGIN[s.politicalRegime] || 0;
	if (!closed && (toVote > 4 || toVote < 1 || !campaignOpen(s))) return null;
	const base = clamp(50 + ((s.approval || 50) - 50 + groupTurnoutShift(s)) * .85 + 2.5, 0, 100);
	const spent = closed ? {} : { ...s.campaignSpend };
	if (!closed) Object.entries(extraPlan || {}).forEach(([id, n]) => {
		spent[id] = (spent[id] || 0) + n;
	});
	const byRegion = regionVoteShares(s, base, false).map((r) => ({
		id: r.id,
		base: r.share,
		spent: spent[r.id] || 0,
		share: clamp(r.share + campaignBonus(spent[r.id], r.share), 0, 100)
	})).map((r) => ({
		...r,
		label: swingLabel(r.base)
	}));
	const national = byRegion.reduce((a, b) => a + b.share, 0) / (byRegion.length || 1);
	if (closed) {
		const official = regionVoteShares(s, base, true);
		return {
			national,
			byRegion,
			closed: true,
			margin: closed,
			noElections: !!s.noElections,
			quartersToElection: s.noElections ? null : toVote,
			official: official.reduce((a, b) => a + b.share, 0) / (official.length || 1)
		};
	}
	return {
		national,
		byRegion,
		quartersToElection: toVote,
		margin: 2.5
	};
}
function sanitizeCampaignPlan(plan, s) {
	const out = {};
	let left = 4;
	(s ? votingRegions(s) : MAP_REGIONS).forEach((r) => {
		const n = Math.max(0, Math.min(left, Math.floor(Number((plan || {})[r.id]) || 0)));
		if (n > 0) {
			out[r.id] = n;
			left -= n;
		}
	});
	return out;
}
function botCampaignPlan(s) {
	const f = electionForecast(s);
	if (!f || f.closed) return {};
	const plan = {};
	[...f.byRegion].sort((a, b) => Math.abs(a.share - 50) - Math.abs(b.share - 50)).slice(0, 4).forEach((r) => {
		plan[r.id] = 1;
	});
	return plan;
}
function campaignStep(s, decisions) {
	const toVote = Number.isFinite(s.quartersToElection) ? s.quartersToElection : 16;
	if (toVote > 4 || toVote < 1 || !campaignOpen(s)) return {
		spend: { ...s.campaignSpend },
		spendPct: 0
	};
	const plan = sanitizeCampaignPlan(decisions.campaignPlan, s);
	const spend = { ...s.campaignSpend };
	let total = 0;
	Object.entries(plan).forEach(([id, n]) => {
		spend[id] = (spend[id] || 0) + n;
		total += n;
	});
	return {
		spend,
		spendPct: total * CAMPAIGN_COST
	};
}
// src/lib/engine.js
let __uid = 1;
const uid = () => `x${__uid++}`;
const annualToQuarterlyFactor = (annualPct) => Math.pow(1 + annualPct / 100, 1 / 4);
const applyAnnualGrowth = (value, annualPct) => value * annualToQuarterlyFactor(annualPct);
const annualizedGrowth = (from, to) => from > 0 && Number.isFinite(from) && Number.isFinite(to) ? (Math.pow(Math.max(to, 1e-9) / from, 4) - 1) * 100 : 0;
const gauss = (sigma) => sigma * ((rng() + rng() + rng() - 1.5) / 1.5);
const sign = (v) => v > 1e-4 ? 1 : v < -1e-4 ? -1 : 0;
const ema = (prev, next, w) => prev * (1 - w) + next * w;
const saturating = (x, slope, scale) => slope * scale * (1 - Math.exp(-Math.max(0, x) / scale));
const fmt1 = (v) => ruNum(v, 1);
const fmt2 = (v) => ruNum(v, 2);
const fmtSigned1 = (v) => ruSigned(v, 1);
const MONEY_UNITS = [
	[1e9, "секстлн"],
	[1e6, "квинтлн"],
	[1e3, "квадрлн"],
	[1, "трлн"]
];
const fmtMoney = (bn) => {
	if (!Number.isFinite(bn)) return "—";
	if (Math.abs(bn) < 1e3) return ruUnit(bn, 0, "млрд");
	const trn = bn / 1e3;
	const unit = MONEY_UNITS.find(([min]) => Math.abs(trn) >= min) || MONEY_UNITS[MONEY_UNITS.length - 1];
	return ruUnit(trn / unit[0], 2, unit[1]);
};
const fmtMoneySigned = (bn) => (bn >= 0 ? "+" : "") + fmtMoney(bn);
const FX_REGIMES = [
	{
		id: "free",
		label: "Плавающий",
		hint: "Курс определяется платёжным балансом. Резервы не тратятся, но инфляция импортируется быстрее."
	},
	{
		id: "managed",
		label: "Управляемый",
		hint: "ЦБ гасит половину давления интервенциями. Умеренный расход резервов."
	},
	{
		id: "peg",
		label: "Фиксированный",
		hint: "Курс удерживается почти жёстко. При исчерпании резервов — срыв и девальвация."
	}
];
const LEVERS = [
	{
		id: "keyRate",
		group: "monetary",
		subgroup: "core",
		label: "Ключевая ставка",
		suffix: "%",
		min: 0,
		max: 25,
		step: .25,
		type: "level"
	},
	{
		id: "inflationTarget",
		group: "monetary",
		subgroup: "core",
		label: "Цель по инфляции",
		suffix: "%",
		min: 1,
		max: 12,
		step: .25,
		type: "level",
		hint: "Смена цели стоит доверия: ожидания перестают верить объявленной цифре"
	},
	{
		id: "reserveReq",
		group: "monetary",
		subgroup: "core",
		label: "Норма резервирования",
		suffix: "%",
		min: 0,
		max: 20,
		step: .5,
		type: "level"
	},
	{
		id: "capitalRequirement",
		group: "monetary",
		subgroup: "macropru",
		label: "Требование к капиталу банков",
		suffix: "%",
		min: 8,
		max: 18,
		step: .5,
		type: "level",
		hint: "Макропруденциальный норматив: выше — меньше кредитный бум, но и меньше кредита"
	},
	{
		id: "moneySupplyOp",
		group: "monetary",
		subgroup: "core",
		label: "Операции с денежной массой",
		suffix: "%",
		min: -10,
		max: 10,
		step: .5,
		type: "flow",
		hint: "QE (+) / QT (−) за квартал"
	},
	{
		id: "fxIntervention",
		group: "monetary",
		subgroup: "core",
		label: "Валютные интервенции",
		suffix: " млрд",
		min: -25,
		max: 25,
		step: 1,
		type: "flow",
		scale: "gdp",
		hint: "Покупка валюты (+) ослабляет нацвалюту, продажа (−) укрепляет и тратит резервы"
	},
	{
		id: "liquidity",
		group: "monetary",
		subgroup: "core",
		label: "Управление ликвидностью банков",
		suffix: " млрд",
		min: -20,
		max: 20,
		step: 1,
		type: "flow",
		scale: "gdp",
		hint: "Инъекция (+) / изъятие (−)"
	},
	{
		id: "fxTarget",
		group: "monetary",
		subgroup: "core",
		label: "Целевой уровень курса",
		suffix: "",
		min: 40,
		max: 400,
		step: 1,
		type: "level",
		onlyIf: (d) => d.fxRegime !== "free",
		hint: "Ориентир, который ЦБ защищает интервенциями. Выше — слабее нацвалюта"
	},
	{
		id: "incomeTaxRate",
		group: "fiscal",
		subgroup: "taxes",
		label: "Подоходный налог",
		suffix: "%",
		min: 0,
		max: 45,
		step: .5,
		type: "level"
	},
	{
		id: "socialContribRate",
		group: "fiscal",
		subgroup: "taxes",
		label: "Социальные взносы",
		suffix: "%",
		min: 0,
		max: 40,
		step: .5,
		type: "level"
	},
	{
		id: "profitTaxRate",
		group: "fiscal",
		subgroup: "taxes",
		label: "Налог на прибыль",
		suffix: "%",
		min: 0,
		max: 45,
		step: .5,
		type: "level"
	},
	{
		id: "vatRate",
		group: "fiscal",
		subgroup: "taxes",
		label: "НДС",
		suffix: "%",
		min: 0,
		max: 30,
		step: .5,
		type: "level"
	},
	{
		id: "exciseRate",
		group: "fiscal",
		subgroup: "taxes",
		label: "Акцизы",
		suffix: "%",
		min: 0,
		max: 25,
		step: .5,
		type: "level"
	},
	{
		id: "capitalTaxRate",
		group: "fiscal",
		subgroup: "taxes",
		label: "Налог на капитал",
		suffix: "%",
		min: 0,
		max: 35,
		step: .5,
		type: "level"
	},
	{
		id: "govSpending",
		group: "fiscal",
		subgroup: "core",
		label: "Госзакупки и содержание государства",
		suffix: "%",
		min: -15,
		max: 15,
		step: .5,
		type: "flow",
		persistent: true,
		hint: "Реальный темп роста — действует, пока не измените"
	},
	{
		id: "transfers",
		group: "fiscal",
		subgroup: "core",
		label: "Социальные выплаты",
		suffix: "%",
		min: -15,
		max: 15,
		step: .5,
		type: "flow",
		persistent: true,
		hint: "Реальный темп роста — сильный эффект в кризис, слабый при перегреве"
	},
	{
		id: "govInvestment",
		group: "fiscal",
		subgroup: "core",
		label: "Госинвестиции в инфраструктуру",
		suffix: "%",
		min: -15,
		max: 15,
		step: .5,
		type: "flow",
		persistent: true,
		hint: "Единственный расход, повышающий потенциальный ВВП"
	},
	{
		id: "bondIssuance",
		group: "fiscal",
		subgroup: "debt",
		label: "Размещение облигаций",
		suffix: " млрд",
		min: 0,
		max: 60,
		step: 5,
		type: "flow",
		scale: "gdp",
		hint: "Занять сверх того, что нужно для покрытия дефицита — долг растёт сразу, деньги идут в резерв"
	},
	{
		id: "shareHealth",
		group: "fiscal",
		subgroup: "budget",
		label: "Здравоохранение",
		suffix: "%",
		min: 5,
		max: 40,
		step: 1,
		type: "level",
		hint: "Доля госзакупок"
	},
	{
		id: "shareEducation",
		group: "fiscal",
		subgroup: "budget",
		label: "Образование",
		suffix: "%",
		min: 5,
		max: 40,
		step: 1,
		type: "level",
		hint: "Долгосрочно — человеческий капитал"
	},
	{
		id: "shareScience",
		group: "fiscal",
		subgroup: "budget",
		label: "Наука и НИОКР",
		suffix: "%",
		min: 0,
		max: 20,
		step: 1,
		type: "level",
		hint: "Долгосрочно — производительность (TFP)"
	},
	{
		id: "shareDefense",
		group: "fiscal",
		subgroup: "budget",
		label: "Оборона",
		suffix: "%",
		min: 2,
		max: 40,
		step: 1,
		type: "level"
	},
	{
		id: "shareAdmin",
		group: "fiscal",
		subgroup: "budget",
		label: "Госаппарат",
		suffix: "%",
		min: 2,
		max: 30,
		step: 1,
		type: "level"
	}
];
const LEVER_BY_ID = Object.fromEntries(LEVERS.map((l) => [l.id, l]));
const clampToLeverRange = (id, v) => clamp(v, LEVER_BY_ID[id].min, LEVER_BY_ID[id].max);
const KEY_RATE_BASE_MAX = 25;
function keyRateCap(e) {
	if (!e) return KEY_RATE_BASE_MAX;
	const pressure = Math.max(e.inflation || 0, e.inflationExpectations || 0);
	return Math.max(KEY_RATE_BASE_MAX, Math.ceil((pressure + 15) / 5) * 5);
}
function scaleLever(l, e) {
	if (l.id === "keyRate") return {
		...l,
		max: keyRateCap(e)
	};
	if (l.scale === "gdp") {
		const k = Math.max(1, e.nominalGdp / CONFIG.initial.gdp);
		const mag = Math.max(5, Math.round(l.max * k / 5) * 5);
		return {
			...l,
			min: l.min < 0 ? -mag : 0,
			max: mag,
			step: Math.max(1, Math.round(mag / 25))
		};
	}
	if (l.id === "fxTarget") {
		const cur = e.exchangeRate;
		return {
			...l,
			min: Math.round(cur * .6),
			max: Math.round(cur * 1.6),
			step: .5
		};
	}
	return l;
}
const clampToLever = (id, v, e) => {
	const base = LEVER_BY_ID[id];
	if (!base || !Number.isFinite(v)) return v;
	const l = e ? scaleLever(base, e) : base;
	return clamp(roundTo(v, l.step), l.min, l.max);
};
function currencyUnionRate(state) {
	const u = state && state.currencyUnion;
	if (!u || !Array.isArray(u.ratePath) || !u.ratePath.length) return null;
	return u.ratePath[clamp(u.q || 0, 0, u.ratePath.length - 1)];
}
function taylorRate(e) {
	if (!e) return null;
	const target = Number.isFinite(e.inflationTarget) ? e.inflationTarget : CONFIG.target.inflation;
	const v = (e.rStar ?? 2) + e.inflation + .5 * (e.inflation - target) + .5 * (e.outputGap || 0);
	return Number.isFinite(v) ? Math.max(0, v) : null;
}
function defaultDecisions(state, prevDecisions) {
	return {
		keyRate: state.keyRate,
		reserveReq: state.reserveReq,
		capitalRequirement: state.capitalRequirement,
		moneySupplyOp: 0,
		fxIntervention: 0,
		liquidity: 0,
		bondIssuance: 0,
		fxRegime: state.fxRegime,
		emergency: false,
		sovereignDefault: false,
		imfProgram: false,
		pressAnswer: null,
		guidance: null,
		startProject: null,
		regionResponse: null,
		warOrder: null,
		campaignPlan: null,
		integrate: null,
		treaty: null,
		groupResponse: null,
		diplomacy: null,
		warTarget: null,
		inflationTarget: state.inflationTarget,
		fxTarget: state.fxTarget,
		incomeTaxRate: state.incomeTaxRate,
		profitTaxRate: state.profitTaxRate,
		vatRate: state.vatRate,
		exciseRate: state.exciseRate,
		capitalTaxRate: state.capitalTaxRate,
		socialContribRate: state.socialContribRate,
		govSpending: prevDecisions ? prevDecisions.govSpending : 0,
		transfers: prevDecisions ? prevDecisions.transfers : 0,
		govInvestment: prevDecisions ? prevDecisions.govInvestment : 0,
		shareHealth: state.budgetShares.health,
		shareEducation: state.budgetShares.education,
		shareScience: state.budgetShares.science,
		shareDefense: state.budgetShares.defense,
		shareAdmin: state.budgetShares.admin
	};
}
const getCbPersona = (id) => CB_PERSONAS.find((p) => p.id === id) || CB_PERSONAS[1];
function personaAfterElection(kind, economy) {
	const line = economy.governmentLine || "centrist";
	if (kind === "ministry_finance") return line === "populist" ? "populist" : line === "austerity" ? "austerity" : "technocrat";
	return line === "populist" ? "dove" : line === "austerity" ? "hawk" : "pragmatic";
}
const getMofPersona = (id) => MOF_PERSONAS.find((p) => p.id === id) || MOF_PERSONAS[0];
const roundTo = (v, step) => Math.round(v / step) * step;
function stabilizationNeeded(s) {
	const tgt = Number.isFinite(s.inflationTarget) ? s.inflationTarget : CONFIG.target.inflation;
	const running = (s.stabilizationCred || 0) > .05;
	return s.inflation >= tgt + 8 || running && s.inflation > tgt + 2;
}
const CB_STABILIZATION = {
	hawk: {
		margin: 5,
		step: 12,
		cut: 4
	},
	pragmatic: {
		margin: 3.5,
		step: 7,
		cut: 6
	},
	dove: {
		margin: 3,
		step: 3.5,
		cut: 8
	}
};
function botCentralBank(s, personaId, _difficulty) {
	const P = getCbPersona(personaId);
	const cbTarget = Number.isFinite(s.inflationTarget) ? s.inflationTarget : CONFIG.target.inflation;
	const inflGap = s.inflation - cbTarget;
	const sanctionsTolerance = (s.sanctionsQuartersLeft || 0) > 0 ? P.tolerance * 1.3 : P.tolerance;
	const effInflGap = Math.abs(inflGap) < sanctionsTolerance ? inflGap * .35 : inflGap;
	const overheat = Math.max(0, s.outputGap - 1.5);
	const taylor = s.rStar + s.inflationExpectations + P.infl * effInflGap + P.gap * s.outputGap + P.fiscalLean * 2.2 * (s.fiscalImpulse || 0) + .45 * overheat + (s.cbCredibility < 45 ? .8 : 0) + .25 * Math.max(0, s.inflationExpectations - cbTarget - 1);
	const deepSlump = s.outputGap < -2 && s.inflation < cbTarget + .5;
	const smoothing = deepSlump ? Math.min(P.smooth, .55) : P.smooth;
	const smoothed = smoothing * s.keyRate + (1 - smoothing) * taylor;
	const maxStep = deepSlump ? P.maxMove * 1.6 : P.maxMove;
	const rawMove2 = clamp(smoothed - s.keyRate, -maxStep, maxStep);
	const move = Math.abs(rawMove2) < .25 ? 0 : roundTo(rawMove2, .25);
	let keyRate = clamp(roundTo(s.keyRate + move, .25), 0, keyRateCap(s));
	const stabMode = stabilizationNeeded(s);
	const SP = CB_STABILIZATION[P.id] || CB_STABILIZATION.pragmatic;
	if (stabMode) {
		const need = roundTo(Math.max(s.inflation, s.inflationExpectations) + SP.margin, .25);
		const next = need > s.keyRate ? Math.min(need, s.keyRate + SP.step) : Math.max(need, s.keyRate - SP.cut);
		keyRate = clamp(roundTo(next, .25), 0, keyRateCap(s));
	}
	if (s.keyRate - Math.max(0, taylor) > 5 && s.inflation < cbTarget + 2) keyRate = clamp(roundTo(Math.max(Math.max(0, taylor), s.keyRate - SP.cut), .25), 0, keyRateCap(s));
	const fxTargetCur = s.fxTarget;
	const crisis = s.bankingRisk >= CONFIG.thresholds.bankingRisk || s.bankCapitalAdequacy < 9;
	const emergency = crisis;
	let liquidity = 0;
	if (s.bankLiquidity < 45) liquidity = 12;
	else if (s.bankLiquidity < 58) liquidity = 6;
	if (crisis) liquidity = Math.max(liquidity, 14);
	let moneySupplyOp = 0;
	if (keyRate < .8 && s.outputGap < -2 && !stabMode) moneySupplyOp = 2.5;
	if (s.outputGap > 3 && s.inflation > 7) moneySupplyOp = -2;
	let fxIntervention = 0;
	const reservesOk = s.reserves >= .5 * CONFIG.initial.reserves;
	let fxRegime = stabMode && reservesOk && s.fxRegime === "free" ? "managed" : s.fxRegime;
	if (s.regime === "currency" && s.reserves > 120) fxIntervention = -10;
	if (s.currencyUnion) {
		keyRate = currencyUnionRate(s);
		moneySupplyOp = 0;
		fxIntervention = 0;
		fxRegime = "union";
	}
	let capitalRequirement = s.capitalRequirement;
	if (s.creditGap > 6) capitalRequirement = clamp(s.capitalRequirement + .5 * P.macropru, 8, 18);
	else if (s.creditGap < -4 && s.capitalRequirement > 10.5) capitalRequirement = clamp(s.capitalRequirement - .5, 8, 18);
	let reserveReq = s.reserveReq;
	if (s.creditGap > 7 && s.reserveReq < 12) reserveReq = clamp(s.reserveReq + 1, 0, 20);
	else if ((s.creditCrunch || s.bankLiquidity < 50) && s.reserveReq > 3) reserveReq = clamp(s.reserveReq - 1, 0, 20);
	return buildCbResult(s, P, {
		keyRate,
		reserveReq,
		capitalRequirement,
		moneySupplyOp,
		fxIntervention,
		liquidity,
		fxRegime,
		emergency,
		cbTarget,
		fxTargetCur,
		stabMode
	});
}
function buildCbResult(s, P, vals) {
	const { keyRate, reserveReq, capitalRequirement, moneySupplyOp, fxIntervention, liquidity, fxRegime, emergency, cbTarget, fxTargetCur, stabMode } = vals;
	const parts = [];
	if (Math.abs(keyRate - s.keyRate) > .05) parts.push(`${keyRate > s.keyRate ? "повысил" : "снизил"} ключевую ставку до ${ruNum(keyRate, 2)}%`);
	else parts.push(`сохранил ключевую ставку на уровне ${ruNum(keyRate, 2)}%`);
	if (Math.abs(reserveReq - s.reserveReq) > .05) parts.push(`изменил норму резервирования до ${ruNum(reserveReq, 1)}%`);
	if (liquidity > 0) parts.push(`предоставил банкам ликвидность (${liquidity} млрд)`);
	if (emergency) parts.push("запустил экстренную поддержку банков");
	if (Math.abs(capitalRequirement - s.capitalRequirement) > .05) parts.push(`изменил норматив капитала до ${ruNum(capitalRequirement, 1)}%`);
	if (fxIntervention < 0) parts.push("вышел на валютный рынок в поддержку курса");
	if (moneySupplyOp !== 0) parts.push(moneySupplyOp > 0 ? "начал выкуп активов" : "начал изъятие ликвидности");
	let demand = null;
	if ((s.fiscalImpulse || 0) > .6 && s.outputGap > 1) demand = `Центральный банк требует немедленно прекратить наращивание бюджетного импульса: разрыв выпуска уже ${fmtSigned1(s.outputGap)}%, и каждый дополнительный рубль расходов ЦБ будет вынужден компенсировать ставкой.`;
	else if (s.outputGap > 2.5) demand = `Центральный банк указывает на перегрев (разрыв выпуска ${fmtSigned1(s.outputGap)}%): без бюджетной консолидации подавить инфляцию можно будет только ценой рецессии.`;
	else if (s.budgetBalancePctGdp < -5) demand = `Центральный банк требует сократить дефицит (${fmt1(Math.abs(s.budgetBalancePctGdp))}% ВВП): бюджетный импульс вынуждает держать ставку выше.`;
	else if (s.inflation > 7 && (s.fiscalImpulse || 0) > .3) demand = "Центральный банк предупреждает: бюджетная экспансия при такой инфляции будет полностью компенсирована ставкой.";
	else if (s.debtToGdp > 90) demand = "Центральный банк указывает на долговую нагрузку — премия за риск растёт вместе с ней.";
	const stance = clamp((keyRate - s.inflationExpectations - s.rStar) / 3, -1, 1);
	return {
		quote: (() => {
			if (emergency) return "Мы приняли решение поддержать банковскую систему. Да, это денежная эмиссия, и мы понимаем её инфляционную цену — но альтернатива дороже: остановка платежей парализовала бы всю экономику.";
			if (stabMode && keyRate > s.keyRate + .05) return `Инфляция ${fmt1(s.inflation)}% — это уже не цикл, а бегство от денег. Реальная ставка ${fmtSigned1(keyRate - s.inflationExpectations)}% должна вернуть смысл сбережениям. Но программа сработает, только если бюджет перестанет требовать денег: одна ставка без Минфина — полдела.`;
			if ((s.sanctionsQuartersLeft || 0) > 6) {
				if (P.id === "hawk") return `Санкции против торгового партнёра разгоняют цены на импорт — это разовый сдвиг уровня цен, а не устойчивая инфляция, но мы не готовы списывать на него всё отклонение от цели без реакции.`;
				if (P.id === "dove") return `Подорожавший из-за санкций импорт — это удар по издержкам, а не по спросу. Гасить его ставкой значит добавить к чужому решению ещё и рецессию, поэтому мы смотрим сквозь большую часть этого всплеска.`;
				return `Санкции против торгового партнёра — не наше решение, но инфляционные последствия разбирать приходится нам: часть всплеска — разовый эффект дорогого импорта, и на него мы реагируем мягче, чем на устойчивую инфляцию спроса.`;
			}
			if (keyRate > s.keyRate + .05) {
				if (s.outputGap > 1.5) return `Экономика работает выше своих возможностей: разрыв выпуска ${fmtSigned1(s.outputGap)}%. Мы повышаем ставку не потому, что хотим замедлить рост, а потому, что этот рост уже не производится — он только переоценивается в ценах.`;
				if ((s.fiscalImpulse || 0) > .4) return `Бюджетный импульс ${fmtSigned1(s.fiscalImpulse)} п.п. добавляет спрос, который экономика не может удовлетворить. Мы вынуждены компенсировать это ставкой — и хотели бы, чтобы в следующий раз эта работа была разделена между нами и Минфином.`;
				return `Инфляция ${fmt1(s.inflation)}% при цели ${fmt1(cbTarget)}%, ожидания ${fmt1(s.inflationExpectations)}%. Заякоренные ожидания — наш главный актив, и мы не готовы им рисковать ради нескольких месяцев более быстрого роста.`;
			}
			if (keyRate < s.keyRate - .05) {
				if (s.outputGap < -2) return `Разрыв выпуска ${fmtSigned1(s.outputGap)}%, безработица ${fmt1(s.unemployment)}% против естественного уровня ${fmt1(s.nairu)}%. Держать жёсткие условия, когда спроса и так не хватает, — значит превращать временные потери в постоянные.`;
				return `Инфляция вернулась к ${fmt1(s.inflation)}% при цели ${fmt1(cbTarget)}%, и мы можем позволить себе снять часть жёсткости. Смягчение будет постепенным: развернуть политику дешевле, чем восстанавливать доверие.`;
			}
			if (Math.abs(s.inflation - cbTarget) > 2) return `Мы сохраняем ставку, хотя инфляция ${fmt1(s.inflation)}% отличается от цели. Значительная часть этого отклонения объясняется разовыми факторами, а реагировать ставкой на разовый шок — значит платить выпуском дважды.`;
			return `Текущие условия соответствуют нашим оценкам нейтральных: реальная ставка ${fmtSigned1(keyRate - s.inflationExpectations)}% против нейтральной ${fmt1(s.rStar)}%. Менять курс без причины — худшее, что может делать центральный банк.`;
		})(),
		decisions: {
			keyRate: clampToLever("keyRate", keyRate, s),
			reserveReq: clampToLever("reserveReq", reserveReq, s),
			capitalRequirement: clampToLever("capitalRequirement", capitalRequirement, s),
			moneySupplyOp: clampToLever("moneySupplyOp", moneySupplyOp, s),
			fxIntervention: clampToLever("fxIntervention", fxIntervention, s),
			liquidity: clampToLever("liquidity", liquidity, s),
			fxRegime,
			emergency,
			inflationTarget: clampToLever("inflationTarget", cbTarget, s),
			fxTarget: fxTargetCur
		},
		detail: [
			`ставка ${ruNum(keyRate, 2)}% (реальная ${fmtSigned1(keyRate - s.inflationExpectations)}% при нейтральной ${fmt1(s.rStar)}%)`,
			`цель по инфляции ${ruNum(cbTarget, 2)}%, фактическая ${fmt1(s.inflation)}%`,
			`норма резервирования ${ruNum(reserveReq, 1)}%, норматив капитала ${ruNum(capitalRequirement, 1)}%`,
			`ликвидность банкам ${liquidity ? `+${liquidity} млрд` : "не предоставлялась"}, режим курса ${fxRegime === "free" ? "плавающий" : fxRegime === "managed" ? "управляемый" : fxRegime === "union" ? "валютный союз" : "фиксированный"}`
		],
		note: `Центральный банк (${P.name}) ${parts.join(", ")}.`,
		newsNote: `Центральный банк ${parts.join(", ")}.`,
		demand,
		stance,
		institution: "cb",
		headline: keyRate > s.keyRate + .05 ? "ужесточение" : keyRate < s.keyRate - .05 ? "смягчение" : "без изменений",
		newsHeadline: `ЦБ ${keyRate > s.keyRate + .05 ? "УЖЕСТОЧАЕТ ПОЛИТИКУ" : keyRate < s.keyRate - .05 ? "СМЯГЧАЕТ ПОЛИТИКУ" : "СОХРАНЯЕТ КУРС"}: СТАВКА ${ruNum(keyRate, 2)}%`,
		publicHeadline: `РЕШЕНИЕ ЦБ: КЛЮЧЕВАЯ СТАВКА ${ruNum(keyRate, 2)}%`,
		publicNote: `Ставка ${ruNum(keyRate, 2)}%, норма резервирования ${ruNum(reserveReq, 1)}%, норматив капитала ${ruNum(capitalRequirement, 1)}%, цель по инфляции ${ruNum(cbTarget, 2)}%.`
	};
}
function redescribeCbAction(s, personaId, finalDecisions) {
	return buildCbResult(s, getCbPersona(personaId), {
		keyRate: finalDecisions.keyRate,
		reserveReq: finalDecisions.reserveReq,
		capitalRequirement: finalDecisions.capitalRequirement,
		moneySupplyOp: finalDecisions.moneySupplyOp,
		fxIntervention: finalDecisions.fxIntervention,
		liquidity: finalDecisions.liquidity,
		fxRegime: finalDecisions.fxRegime,
		emergency: finalDecisions.emergency,
		cbTarget: finalDecisions.inflationTarget,
		fxTargetCur: finalDecisions.fxTarget
	});
}
function botFinanceMinistry(s, personaId, _difficulty) {
	const P = getMofPersona(personaId);
	const debtStress = clamp((s.debtToGdp - P.debtLimit) / 20, 0, 2);
	const targetDeficit = P.anchor - P.cyclical * Math.max(0, -s.outputGap) * 1.1 + debtStress * 2.2;
	const consolidationNeed = targetDeficit - s.budgetBalancePctGdp;
	const base = -1 * clamp(consolidationNeed, -3, 3);
	const dead = (v) => Math.abs(v) < .5 ? 0 : roundTo(v, .5);
	let govSpending = clamp(base + .35 * Math.max(0, -s.outputGap) * P.cyclical, -4, 4);
	let transfers = clamp(.4 * P.transferBias * Math.max(0, s.unemployment - 5) + (P.id === "populist" ? 1.2 : 0) - 1.1 * Math.max(0, consolidationNeed), -5, 7);
	let govInvestment = clamp(P.investBias * (1.2 - .9 * Math.max(0, consolidationNeed)) + .4 * Math.max(0, -s.outputGap), -5, 6);
	if (s.inflation > 8 && P.id !== "populist") {
		govSpending -= .8;
		transfers -= .6;
	}
	const stabMode = stabilizationNeeded(s);
	if (stabMode) {
		if (P.id === "populist") govSpending = Math.min(govSpending, -.5);
		else {
			govSpending = Math.min(govSpending, P.id === "austerity" ? -4 : -3);
			transfers = Math.min(transfers, P.id === "austerity" ? -2 : -1);
			govInvestment = Math.min(govInvestment, 0);
		}
	}
	const toVote = Number.isFinite(s.quartersToElection) ? s.quartersToElection : 16;
	if (s.outputGap < -2 && s.recessionStreak >= 2 && !stabMode) {
		govSpending += 1.2;
		govInvestment += 1.6;
		transfers += .8;
	}
	if (toVote <= CONFIG.election.campaign && (!stabMode || P.id === "populist")) {
		transfers += 1.5 * (P.id === "populist" ? 1.6 : 1);
		govSpending += .7;
	} else if (toVote >= CONFIG.election.cycle - 2) {
		transfers -= .8;
		govSpending -= .5;
	}
	govSpending = dead(govSpending);
	transfers = dead(transfers);
	govInvestment = dead(govInvestment);
	const TAX_GRID = LEVER_BY_ID.vatRate ? LEVER_BY_ID.vatRate.step : .5;
	const taxMove = (mult) => Math.max(TAX_GRID, roundTo(P.taxWill * (mult || 1), TAX_GRID));
	const taxStep = taxMove(1);
	let incomeTaxRate = s.incomeTaxRate;
	let vatRate = s.vatRate;
	let profitTaxRate = s.profitTaxRate;
	let capitalTaxRate = s.capitalTaxRate;
	let socialContribRate = s.socialContribRate;
	let exciseRate = s.exciseRate;
	if (consolidationNeed > 1.5) {
		if (P.id === "populist") {
			profitTaxRate = clamp(profitTaxRate + taxStep, 0, 45);
			capitalTaxRate = clamp(capitalTaxRate + taxStep, 0, 35);
		} else if (P.id === "technocrat") {
			vatRate = clamp(vatRate + taxStep, 0, 30);
			exciseRate = clamp(exciseRate + taxStep, 0, 25);
		} else {
			vatRate = clamp(vatRate + taxMove(.6), 0, 30);
			incomeTaxRate = clamp(incomeTaxRate + taxMove(.6), 0, 45);
		}
	} else if (consolidationNeed < -2 && s.outputGap < 0) {
		if (P.id === "populist") incomeTaxRate = clamp(incomeTaxRate - taxStep, 0, 45);
		else profitTaxRate = clamp(profitTaxRate - taxStep, 0, 45);
	}
	const LAFFER_CAP = {
		incomeTaxRate: 25,
		vatRate: 22,
		profitTaxRate: 30,
		capitalTaxRate: 25,
		exciseRate: 18,
		socialContribRate: 34
	};
	const noRaise = s.shadowShare > 25;
	const lafferCap = (v, k) => v <= s[k] ? v : Math.min(v, noRaise ? s[k] : Math.max(s[k], LAFFER_CAP[k]));
	incomeTaxRate = lafferCap(incomeTaxRate, "incomeTaxRate");
	vatRate = lafferCap(vatRate, "vatRate");
	profitTaxRate = lafferCap(profitTaxRate, "profitTaxRate");
	capitalTaxRate = lafferCap(capitalTaxRate, "capitalTaxRate");
	exciseRate = lafferCap(exciseRate, "exciseRate");
	socialContribRate = lafferCap(socialContribRate, "socialContribRate");
	const caps = s.taxCommit && s.taxCommit.caps;
	if (caps) {
		const cap = (v, k) => Number.isFinite(caps[k]) ? Math.min(v, caps[k]) : v;
		incomeTaxRate = cap(incomeTaxRate, "incomeTaxRate");
		vatRate = cap(vatRate, "vatRate");
		profitTaxRate = cap(profitTaxRate, "profitTaxRate");
		capitalTaxRate = cap(capitalTaxRate, "capitalTaxRate");
		socialContribRate = cap(socialContribRate, "socialContribRate");
		exciseRate = cap(exciseRate, "exciseRate");
	}
	const drift = (cur, tgt) => Math.abs(tgt - cur) < 1 ? cur : clamp(Math.round(cur + clamp(tgt - cur, -1, 1)), 0, 45);
	const shareHealth = drift(s.budgetShares.health, P.shares.health);
	const shareEducation = drift(s.budgetShares.education, P.shares.education);
	const shareScience = drift(s.budgetShares.science, P.shares.science);
	const defenseTarget = Math.max(P.shares.defense + ((s.warQuartersLeft || 0) > 0 ? 5 : 0), s.defenseCommit ? s.defenseCommit.share : 0);
	const shareDefense = drift(s.budgetShares.defense, defenseTarget);
	const shareAdmin = drift(s.budgetShares.admin, P.shares.admin);
	const res = buildMofResult(s, P, targetDeficit, {
		...botRegionPlan(s, P, consolidationNeed),
		incomeTaxRate: clampToLever("incomeTaxRate", incomeTaxRate, s),
		profitTaxRate: clampToLever("profitTaxRate", profitTaxRate, s),
		vatRate: clampToLever("vatRate", vatRate, s),
		exciseRate: clampToLever("exciseRate", exciseRate, s),
		capitalTaxRate: clampToLever("capitalTaxRate", capitalTaxRate, s),
		socialContribRate: clampToLever("socialContribRate", socialContribRate, s),
		govSpending: clampToLever("govSpending", govSpending, s),
		transfers: clampToLever("transfers", transfers, s),
		govInvestment: clampToLever("govInvestment", govInvestment, s),
		shareHealth,
		shareEducation,
		shareScience,
		shareDefense,
		shareAdmin
	});
	const debtMove = botDebtCrisisMove(s, P);
	if (debtMove) res.decisions = {
		...res.decisions,
		...debtMove
	};
	return res;
}
function botDebtCrisisMove(s, P) {
	if (!(s.activeCrises || []).includes("debt")) return null;
	const imfNow = (s.imfQuartersLeft || 0) > 0;
	const locked = (s.marketLockoutQuartersLeft || 0) > 0;
	const defaultAt = P.id === "populist" ? 130 : 180;
	if (!locked && s.debtToGdp > defaultAt) return { sovereignDefault: true };
	if (!imfNow && !locked && P.id !== "populist" && s.debtToGdp > 110) return { imfProgram: true };
	return null;
}
function buildMofResult(s, P, targetDeficit, vals) {
	const { incomeTaxRate, profitTaxRate, vatRate, exciseRate, capitalTaxRate, socialContribRate, govSpending, transfers, govInvestment, shareHealth, shareEducation, shareScience, shareDefense, shareAdmin } = vals;
	const startProject = vals.startProject || null;
	const regionResponse = vals.regionResponse || null;
	const consolidationNeed = targetDeficit - s.budgetBalancePctGdp;
	const parts = [];
	if (Math.abs(govSpending) > .15) parts.push(`${govSpending > 0 ? "нарастил" : "сократил"} госзакупки (${fmtSigned1(govSpending)}%)`);
	if (Math.abs(transfers) > .15) parts.push(`${transfers > 0 ? "повысил" : "урезал"} социальные выплаты (${fmtSigned1(transfers)}%)`);
	if (Math.abs(govInvestment) > .15) parts.push(`${govInvestment > 0 ? "увеличил" : "сократил"} госинвестиции (${fmtSigned1(govInvestment)}%)`);
	if (Math.abs(vatRate - s.vatRate) > .05) parts.push(`изменил НДС до ${ruNum(vatRate, 1)}%`);
	if (Math.abs(profitTaxRate - s.profitTaxRate) > .05) parts.push(`изменил налог на прибыль до ${ruNum(profitTaxRate, 1)}%`);
	if (Math.abs(incomeTaxRate - s.incomeTaxRate) > .05) parts.push(`изменил подоходный налог до ${ruNum(incomeTaxRate, 1)}%`);
	if (startProject && PROJECT_BY_ID[startProject]) parts.push(`начал стройку «${PROJECT_BY_ID[startProject].name}»`);
	if (!parts.length) parts.push("оставил бюджетные параметры без изменений");
	let demand = null;
	if (s.lendingRate - s.inflation > 6) demand = "Минфин требует от ЦБ снизить ставку: стоимость обслуживания долга и кредита душит экономику.";
	else if (s.unemployment > 7.5) demand = "Минфин настаивает на смягчении денежной политики — безработица выше приемлемого уровня.";
	else if (s.inflation > 8 && P.id !== "populist") demand = "Минфин просит ЦБ решительнее подавить инфляцию: она обесценивает бюджетные расходы.";
	const stance = clamp((govSpending + transfers * .6 + govInvestment * .8) / 6 - (vatRate - s.vatRate) * .3, -1, 1);
	return {
		quote: (() => {
			if (consolidationNeed > 1.5) return `Дефицит ${fmt1(Math.abs(s.budgetBalancePctGdp))}% ВВП при долге ${fmt1(s.debtToGdp)}% — это не абстракция, а проценты, которые мы платим вместо школ и дорог. Консолидация неприятна, но занимать дороже, чем экономить.`;
			if ((s.tradeBlocQuartersLeft || 0) > 0) return `Торговый блок уже виден в стоимости займов: премия за риск ниже, чем была бы без него. Не наша заслуга — но пользоваться этим окном мы обязаны, пока согласование с блоком не свело его на нет.`;
			if (s.unemployment > 7) return `Безработица ${fmt1(s.unemployment)}%. Люди без работы не ждут, пока заработают рыночные механизмы, поэтому бюджет берёт часть спроса на себя — и мы готовы объяснить каждый рубль этих расходов.`;
			if (s.outputGap < -1.5) return `Экономика работает ниже своих возможностей. Сейчас мультипликатор государственных расходов высок: каждый вложенный рубль доходит до выпуска, а не до цен. Это редкое окно, и мы им пользуемся.`;
			if (govInvestment > 1) return "Мы смещаем расходы от текущего потребления к инвестициям. Трансферты поддерживают спрос сегодня, инфраструктура повышает то, что страна способна произвести завтра.";
			return `Бюджет исполняется в рамках правила: баланс ${fmtSigned1(s.budgetBalancePctGdp)}% ВВП. Предсказуемость бюджетной политики стоит дешевле, чем любые точечные меры.`;
		})(),
		decisions: {
			incomeTaxRate,
			profitTaxRate,
			vatRate,
			exciseRate,
			capitalTaxRate,
			socialContribRate,
			govSpending,
			transfers,
			govInvestment,
			shareHealth,
			shareEducation,
			shareScience,
			shareDefense,
			shareAdmin,
			startProject,
			regionResponse
		},
		note: `Минфин (${P.name}) ${parts.join(", ")}.`,
		newsNote: `Минфин ${parts.join(", ")}.`,
		demand,
		stance,
		institution: "gov",
		detail: [
			`госзакупки ${fmtSigned1(govSpending)}% к тренду, выплаты ${fmtSigned1(transfers)}%, инвестиции ${fmtSigned1(govInvestment)}%`,
			`НДС ${ruNum(vatRate, 1)}%, прибыль ${ruNum(profitTaxRate, 1)}%, подоходный ${ruNum(incomeTaxRate, 1)}%`,
			`цель по балансу ${fmt1(targetDeficit)}% ВВП при текущем ${fmt1(s.budgetBalancePctGdp)}%`,
			`приоритеты: здравоохранение ${ruNum(shareHealth, 0)}%, образование ${ruNum(shareEducation, 0)}%, наука ${ruNum(shareScience, 0)}%`
		],
		headline: stance > .15 ? "стимулирование" : stance < -.15 ? "консолидация" : "нейтрально",
		newsHeadline: `МИНФИН: ${stance > .15 ? "КУРС НА СТИМУЛИРОВАНИЕ ЭКОНОМИКИ" : stance < -.15 ? "КУРС НА БЮДЖЕТНУЮ КОНСОЛИДАЦИЮ" : "БЮДЖЕТНАЯ ПОЛИТИКА БЕЗ ИЗМЕНЕНИЙ"}`,
		publicHeadline: `БЮДЖЕТ: НДС ${ruNum(vatRate, 1)}%, НАЛОГ НА ПРИБЫЛЬ ${ruNum(profitTaxRate, 1)}%`,
		publicNote: `Госзакупки ${fmtSigned1(govSpending)}% к тренду, выплаты ${fmtSigned1(transfers)}%, инвестиции ${fmtSigned1(govInvestment)}%. Баланс бюджета ${fmtSigned1(s.budgetBalancePctGdp)}% ВВП, долг ${fmt1(s.debtToGdp)}% ВВП.`
	};
}
function redescribeMofAction(s, personaId, finalDecisions) {
	const P = getMofPersona(personaId);
	const debtStress = clamp((s.debtToGdp - P.debtLimit) / 20, 0, 2);
	return buildMofResult(s, P, P.anchor - P.cyclical * Math.max(0, -s.outputGap) * 1.1 + debtStress * 2.2, {
		incomeTaxRate: finalDecisions.incomeTaxRate,
		profitTaxRate: finalDecisions.profitTaxRate,
		vatRate: finalDecisions.vatRate,
		exciseRate: finalDecisions.exciseRate,
		capitalTaxRate: finalDecisions.capitalTaxRate,
		socialContribRate: finalDecisions.socialContribRate,
		govSpending: finalDecisions.govSpending,
		transfers: finalDecisions.transfers,
		govInvestment: finalDecisions.govInvestment,
		shareHealth: finalDecisions.shareHealth,
		shareEducation: finalDecisions.shareEducation,
		shareScience: finalDecisions.shareScience,
		shareDefense: finalDecisions.shareDefense,
		shareAdmin: finalDecisions.shareAdmin,
		startProject: finalDecisions.startProject,
		regionResponse: finalDecisions.regionResponse
	});
}
function describeHumanCbAction(s, playerName, finalDecisions) {
	return buildCbResult(s, {
		...getCbPersona("pragmatic"),
		name: playerName || "игрок"
	}, {
		keyRate: finalDecisions.keyRate,
		reserveReq: finalDecisions.reserveReq,
		capitalRequirement: finalDecisions.capitalRequirement,
		moneySupplyOp: finalDecisions.moneySupplyOp,
		fxIntervention: finalDecisions.fxIntervention,
		liquidity: finalDecisions.liquidity,
		fxRegime: finalDecisions.fxRegime,
		emergency: finalDecisions.emergency,
		cbTarget: finalDecisions.inflationTarget,
		fxTargetCur: finalDecisions.fxTarget
	});
}
function describeHumanMofAction(s, playerName, finalDecisions) {
	const P = {
		...getMofPersona("technocrat"),
		name: playerName || "игрок"
	};
	const debtStress = clamp((s.debtToGdp - P.debtLimit) / 20, 0, 2);
	return buildMofResult(s, P, P.anchor - P.cyclical * Math.max(0, -s.outputGap) * 1.1 + debtStress * 2.2, {
		incomeTaxRate: finalDecisions.incomeTaxRate,
		profitTaxRate: finalDecisions.profitTaxRate,
		vatRate: finalDecisions.vatRate,
		exciseRate: finalDecisions.exciseRate,
		capitalTaxRate: finalDecisions.capitalTaxRate,
		socialContribRate: finalDecisions.socialContribRate,
		govSpending: finalDecisions.govSpending,
		transfers: finalDecisions.transfers,
		govInvestment: finalDecisions.govInvestment,
		shareHealth: finalDecisions.shareHealth,
		shareEducation: finalDecisions.shareEducation,
		shareScience: finalDecisions.shareScience,
		shareDefense: finalDecisions.shareDefense,
		shareAdmin: finalDecisions.shareAdmin,
		startProject: finalDecisions.startProject,
		regionResponse: finalDecisions.regionResponse
	});
}
function simulateQuarter(input, { skip = [] } = {}) {
	const { economy, decisions: rawDecisions0, pendingImpulses, eventCooldowns, difficulty, quarterIndex, stories, botAction, botActions, publicMode } = input;
	const noEvents = !!input.noEvents || skip.includes("events");
	const kids = !!economy.kidsMode;
	const noWar = skip.includes("war") || !!economy.economyOnly || kids;
	const blocked = (id) => PRES_BY_ID[id] && (kids ? kidsBlocked(PRES_BY_ID[id]) : PRES_BY_ID[id].group === "war");
	const rawDecisions = noWar ? {
		...rawDecisions0,
		presidentActions: (rawDecisions0.presidentActions || []).filter((id) => !blocked(id)),
		warTarget: null
	} : rawDecisions0;
	const s = economy;
	bumpNewsId((quarterIndex || 0) * 1e3 + 1);
	const decisions = (() => {
		let changed = false;
		const out = { ...rawDecisions };
		LEVERS.forEach((base) => {
			const v = out[base.id];
			if (!Number.isFinite(v)) return;
			const l = base.scale === "gdp" || base.id === "fxTarget" ? base : scaleLever(base, s);
			const lo = l.scale === "gdp" ? -Infinity : l.min;
			const hi = l.scale === "gdp" ? Infinity : l.max;
			const c = clamp(v, lo, hi);
			if (c !== v) {
				out[l.id] = c;
				changed = true;
			}
		});
		if (s.currencyUnion) {
			Object.assign(out, {
				keyRate: currencyUnionRate(s),
				fxIntervention: 0,
				moneySupplyOp: 0,
				fxRegime: "union",
				fxTarget: s.exchangeRate,
				guidance: void 0
			});
			changed = true;
		}
		return changed ? out : rawDecisions;
	})();
	const C = CONFIG.coef;
	const T = CONFIG.target;
	const nMult = CONFIG.noiseMult[difficulty];
	const NB = CONFIG.noiseBase;
	const infTarget = Number.isFinite(decisions.inflationTarget) ? decisions.inflationTarget : CONFIG.target.inflation;
	const targetChange = infTarget - (Number.isFinite(s.inflationTarget) ? s.inflationTarget : CONFIG.target.inflation);
	const activeCrisesPre = s.activeCrises || [];
	const log = [];
	const news = [];
	const add = (headline, reasonText, amount) => log.push({
		headline,
		reasonText,
		amount
	});
	const cooldowns = { ...eventCooldowns };
	Object.keys(cooldowns).forEach((k) => {
		cooldowns[k] = Math.max(0, cooldowns[k] - 1);
	});
	let queue = [...pendingImpulses];
	const newStories = [];
	const KIND_CAT = {
		demand: "households",
		supply: "business",
		financial: "markets",
		external: "world",
		structural: "business"
	};
	let pandemicTriggered = false;
	let warTriggered = false;
	let warTypeRolled = null;
	const deshtAttack = !noEvents && !noWar && deshtAttackRoll(s);
	if (noWar) cooldowns.war = Math.max(cooldowns.war || 0, 99);
	if (deshtAttack) {
		const evt = EVENTS.find((e) => e.id === "war");
		const built = buildEventImpulses(evt, s);
		warTriggered = true;
		warTypeRolled = "defensive";
		queue = queue.concat(built.impulses);
		cooldowns.war = evt.cooldown;
		news.push(mkNews("world", "ДЕШТ НАПАЛ", `Войска, которые Дешт держал у границы, перешли её. ${built.news}`, { priority: 10 }));
	}
	if (!deshtAttack && !noEvents && rng() < CONFIG.eventProbability[difficulty]) {
		const evt = pickEvent(s, cooldowns);
		if (evt) {
			if (evt.id === "pandemic") pandemicTriggered = true;
			if (evt.id === "war") warTriggered = true;
			const built = buildEventImpulses(evt, s);
			if (evt.id === "war") warTypeRolled = built.warType || null;
			queue = queue.concat(built.impulses);
			cooldowns[evt.id] = evt.cooldown;
			const busy = (stories || []).some((x) => x.tplId === evt.id) || storyConflicts(evt.id, stories);
			if (STORY_TEMPLATES[evt.id] && !busy) newStories.push({
				tplId: evt.id,
				nextIdx: 0,
				wait: storyStartWait(evt.id)
			});
			else news.push(mkNews(KIND_CAT[evt.kind] || "world", evt.title.toUpperCase(), built.news, { priority: 8 }));
		}
	}
	queue = queue.concat(buildDecisionImpulses(decisions, s, difficulty));
	const pres = applyPresidentActions(s, decisions.presidentActions, cooldowns, difficulty);
	queue = queue.concat(pres.impulses);
	pres.newsSpecs.forEach((n) => news.push(mkNews(n.cat, n.headline, n.text, {
		priority: n.priority,
		chain: n.chain
	})));
	const pressQ = pickPressQuestion(s, quarterIndex);
	const pressOpt = pressQ && (pressQ.options.find((o) => o.id === decisions.pressAnswer) || null);
	if (pressOpt) {
		const built = pressOpt.build(s, difficulty) || {};
		queue = queue.concat(built.impulses || []);
		news.push(mkNews("gov", `ПРЕСС-КОНФЕРЕНЦИЯ: ${pressQ.shortLabel}`, `«${pressOpt.quote}»`, { priority: 6 }));
	}
	const RS = regionStep(s, decisions, difficulty, quarterIndex, noEvents);
	queue = queue.concat(RS.impulses);
	RS.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	const GD = groupDemandStep(s, decisions, difficulty, quarterIndex, noEvents);
	queue = queue.concat(GD.impulses);
	GD.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	const AN = annexStep(s, decisions, difficulty, RS.loyaltyDelta);
	queue = queue.concat(AN.impulses);
	AN.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	Object.entries(AN.shock).forEach(([id, v]) => {
		RS.regionShock[id] = (RS.regionShock[id] || 0) + v;
	});
	const CP = campaignStep(s, decisions);
	const WC = warCampaignStep(s, decisions, difficulty);
	queue = queue.concat(WC.impulses);
	WC.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	const RV = revancheStep(s, decisions, difficulty, quarterIndex, !!pres.patch.startWar);
	queue = queue.concat(RV.impulses);
	RV.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	const DF = defenseStep(s, decisions, difficulty, quarterIndex, warTriggered && warTypeRolled === "defensive");
	queue = queue.concat(DF.impulses);
	DF.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	Object.entries(DF.shock).forEach(([id, v]) => {
		RS.regionShock[id] = (RS.regionShock[id] || 0) + v;
	});
	const PC = peaceStep(s, decisions, difficulty, quarterIndex);
	queue = queue.concat(PC.impulses);
	PC.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	let presSpent = pres.spent + Math.max(0, decisions.presidentExtraSpend || 0);
	const reforms = {};
	Object.keys(s.reforms || {}).forEach((k) => {
		reforms[k] = (s.reforms[k] || 0) + 1;
	});
	(pres.patch.reforms || []).forEach((id) => {
		if (reforms[id] === void 0) reforms[id] = 0;
	});
	const RE = reformEffects(reforms);
	let cbTenure = (s.cbTenure || 0) + 1;
	let mofTenure = (s.mofTenure || 0) + 1;
	const startCapital = Number.isFinite(s.politicalCapital) ? s.politicalCapital : 55;
	[[
		"central_bank",
		decisions.appointCb,
		getCbPersona
	], [
		"ministry_finance",
		decisions.appointMof,
		getMofPersona
	]].forEach(([kind, pid, look]) => {
		if (!pid || startCapital - presSpent < APPOINT_COST[kind]) return;
		const eff = appointmentEffects(kind, s, difficulty, look(pid));
		presSpent += eff.cost;
		queue = queue.concat(eff.impulses);
		news.push(mkNews(eff.news.cat, eff.news.headline, eff.news.text, { priority: eff.news.priority }));
		if (kind === "central_bank") cbTenure = 0;
		else mofTenure = 0;
	});
	const DP = diplomacyStep(s, decisions, difficulty, quarterIndex, startCapital - presSpent, noEvents, pres.applied);
	presSpent += DP.spent;
	queue = queue.concat(DP.impulses);
	DP.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	const ticked = tickImpulses(queue);
	const d = ticked.deltas;
	log.push(...ticked.contributions);
	const nextQueue = ticked.nextQueue;
	const worldGdpGrowth = clamp(s.worldGdpGrowth + .1 * (2.5 - s.worldGdpGrowth) + (d.worldGdpGrowth || 0) + gauss(NB.worldGdpGrowth * nMult), -6, 8);
	const worldInflation = clamp(s.worldInflation + .12 * (T.worldInflation - s.worldInflation) + (d.worldInflation || 0) + gauss(NB.worldInflation * nMult), -3, 20);
	const worldRate = clamp(s.worldRate + .1 * (T.foreignRate - s.worldRate) + (d.worldRate || 0) + gauss(NB.worldRate * nMult), 0, 18);
	const commodityIndex = clamp(s.commodityIndex + .06 * (100 - s.commodityIndex) + (d.commodityIndex || 0) + gauss(NB.commodityIndex * nMult), 20, 400);
	const worldDemandIndex = clamp(s.worldDemandIndex + .08 * (100 - s.worldDemandIndex) + (d.worldDemandIndex || 0) + gauss(NB.worldDemandIndex * nMult), 40, 220);
	const prevLockout = Math.max(0, (s.marketLockoutQuartersLeft || 0) - 1);
	const sovereignDefault = !!decisions.sovereignDefault && prevLockout === 0 && (s.activeCrises || []).includes("debt");
	const marketLockoutQuartersLeft = sovereignDefault ? 7 : prevLockout;
	const lockedOutOfMarkets = marketLockoutQuartersLeft > 0;
	const defaultedEver = sovereignDefault || !!s.defaultedEver;
	if (sovereignDefault) {
		news.push(mkNews("crisis", "ДЕФОЛТ: ПРАВИТЕЛЬСТВО ОБЪЯВЛЯЕТ РЕСТРУКТУРИЗАЦИЮ ДОЛГА", "Вместо очередного секвестра — прямой отказ платить по графику. Часть долга списывается принудительно, а доступ к новым заимствованиям закрыт на несколько кварталов: расходы придётся финансировать только из того, что удаётся собрать прямо сейчас.", {
			priority: 10,
			chain: [
				"Долговой кризис",
				"Дефолт",
				"Долг списан",
				"Рынок закрыт",
				"Премия за риск ↑↑"
			]
		}));
		nextQueue.push(makeImpulse("govTrust", -18, "Дефолт по государственному долгу", "fast", difficulty));
		nextQueue.push(makeImpulse("businessConfidence", -16, "Дефолт: инвесторы уходят", "default", difficulty, "other"));
		nextQueue.push(makeImpulse("capitalFlow", -35, "Бегство капитала после дефолта", "default", difficulty));
	}
	const prevImfLeft = Math.max(0, (s.imfQuartersLeft || 0) - 1);
	const imfStarted = !!decisions.imfProgram && prevImfLeft === 0 && !sovereignDefault && (s.activeCrises || []).includes("debt");
	const imfQuartersLeft = imfStarted ? 8 : prevImfLeft;
	const imfActive = imfQuartersLeft > 0;
	if (imfStarted) {
		news.push(mkNews("gov", "МВФ ОДОБРИЛ ЭКСТРЕННОЕ ФИНАНСИРОВАНИЕ", "Вместо реструктуризации — кредит на льготных условиях: ставка по долгу и премия за риск снижаются сразу. Взамен бюджет два года обязан сокращать расходы и выплаты — это уже не решение Минфина, а условие программы, и его нельзя будет отменить, не разорвав саму программу.", {
			priority: 10,
			chain: [
				"Долговой кризис",
				"Программа МВФ",
				"Ставка по долгу ↓",
				"Обязательная консолидация",
				"Доверие ↓"
			]
		}));
		nextQueue.push(makeImpulse("riskPremium", -1.6, "Программа МВФ снижает премию за риск", "fast", difficulty));
		nextQueue.push(makeImpulse("govTrust", -5, "Программа МВФ: обязательная экономия непопулярна", "default", difficulty, "other"));
	} else if ((s.imfQuartersLeft || 0) > 0 && imfQuartersLeft === 0) news.push(mkNews("gov", "ПРОГРАММА МВФ ЗАВЕРШЕНА", "Обязательные условия сняты — бюджетная политика снова полностью в руках Минфина.", { priority: 8 }));
	const rawShares = {
		health: decisions.shareHealth,
		education: decisions.shareEducation,
		science: decisions.shareScience,
		defense: decisions.shareDefense,
		admin: decisions.shareAdmin
	};
	const sum5 = rawShares.health + rawShares.education + rawShares.science + rawShares.defense + rawShares.admin;
	const otherRaw = Math.max(4, 100 - sum5);
	const shareBase = sum5 + otherRaw;
	const ns = (x) => x / shareBase * 100;
	const budgetShares = {
		health: ns(rawShares.health),
		education: ns(rawShares.education),
		science: ns(rawShares.science),
		defense: ns(rawShares.defense),
		admin: ns(rawShares.admin),
		other: ns(otherRaw)
	};
	const prevCommit = s.defenseCommit || null;
	const defenseCommit = decisions.defensePledge && budgetShares.defense > (s.budgetShares ? s.budgetShares.defense : 0) + .5 ? {
		share: Math.round(budgetShares.defense),
		left: 8
	} : prevCommit && prevCommit.left > 1 ? {
		...prevCommit,
		left: prevCommit.left - 1
	} : null;
	const prevTax = s.taxCommit || null;
	const taxNow = Object.fromEntries(TAX_KEYS.map((k) => [k, decisions[k]]));
	const taxCommit = decisions.taxPledge && taxSum(decisions) < taxSum(s) - .25 ? {
		caps: taxNow,
		left: 6
	} : prevTax && prevTax.left > 1 ? {
		caps: Object.fromEntries(TAX_KEYS.map((k) => [k, Math.min(prevTax.caps[k] ?? 99, decisions[k] ?? 99)])),
		left: prevTax.left - 1
	} : null;
	const rStarTarget = 1.55 + .55 * (s.potentialGrowth - 2.3) + .3 * (worldRate - worldInflation) + .25 * (s.riskPremium - 1.4) + (d.rStar || 0);
	const rStar = clamp(ema(s.rStar, rStarTarget, .06), -1.5, 6);
	const riskPremiumTarget = .8 + C.debtLevelPremium * Math.max(0, s.debtToGdp - 55) + .045 * Math.max(0, s.bankingRisk - 45) + .035 * Math.max(0, 55 - s.govTrust) + .03 * Math.max(0, 60 - s.cbCredibility) + .02 * Math.max(0, 55 - s.policyCoordination) - .02 * Math.max(0, -(Number.isFinite(s.netDebtToGdp) ? s.netDebtToGdp : s.debtToGdp)) + (s.regime === "currency" || s.regime === "debt" ? 1.5 : 0) + (lockedOutOfMarkets ? 3.5 : 0) + (defaultedEver ? .3 : 0) + RE.riskPremium - 1.6 * (Number.isFinite(s.stabilizationCred) ? s.stabilizationCred : 0);
	const riskPremium = clamp(ema(s.riskPremium, riskPremiumTarget, .22) + (d.riskPremium || 0), .2, 14);
	const bankSpread = C.bankSpreadBase + .35 * clamp(s.bankNPL - 3, 0, 10) + .25 * clamp(12 - s.bankCapitalAdequacy, 0, 8) + .02 * Math.max(0, 60 - s.bankLiquidity) + .15 * Math.max(0, decisions.reserveReq - 6) + .1 * Math.max(0, decisions.capitalRequirement - 10.5);
	const GUID = guidanceStep(s, decisions.keyRate, decisions.guidance);
	GUID.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	const lendingTarget = decisions.keyRate + C.termPremium + bankSpread + .3 * riskPremium + .6 * GUID.bias;
	const lendingRate = clamp(ema(s.lendingRate, lendingTarget, C.lendingPassthrough[difficulty]), 0, 40);
	const depositRate = clamp(decisions.keyRate - C.depositSpread + .05 * Math.max(0, 55 - s.bankLiquidity), -2, 35);
	const realLendingRate = lendingRate - s.inflationExpectations;
	const realPolicyRate = decisions.keyRate - s.inflationExpectations;
	const neutralLendingReal = rStar + C.termPremium + C.bankSpreadBase;
	const rateGap = realLendingRate - neutralLendingReal;
	const policyStance = realPolicyRate - rStar;
	if (Math.abs(rateGap) > .15) add("gdpGrowth", `Денежные условия ${rateGap > 0 ? "жёстче" : "мягче"} нейтральных на ${fmt1(Math.abs(rateGap))} п.п. (реальная ставка по кредитам ${fmt1(realLendingRate)}% против нейтральных ${fmt1(neutralLendingReal)}%)`, -rateGap * C.invRate * .2);
	const creditDemandGrowth = C.creditDemandBase - C.creditRateSens * rateGap + C.creditConfSens * (s.businessConfidence - 55) / 5 + C.creditAccelerator * (s.gdpGrowth - s.potentialGrowth) - C.creditReserveSens * (decisions.reserveReq - 6) + (d.creditDemand || 0);
	const supplyGrowthCap = (s.bankCapital / (Math.max(8, decisions.capitalRequirement) / 100 * T.riskWeight) / Math.max(1, s.creditVolume) - 1) * 100 * 4;
	const creditCrunch = supplyGrowthCap < creditDemandGrowth - .5;
	const creditGrowth = clamp(Math.min(creditDemandGrowth, supplyGrowthCap), -35, 30);
	const creditVolume = Math.max(1, applyAnnualGrowth(s.creditVolume, creditGrowth));
	if (creditCrunch) add("banking", "Капитал банков ограничивает выдачу новых кредитов (кредитное сжатие)", supplyGrowthCap - creditDemandGrowth);
	const humanCapitalTarget = 100 + 7 * ((budgetShares.health + budgetShares.education) / 100 * s.govPurchasesReal / Math.max(1, s.gdp) * 100 - (CONFIG.initial.budgetShares.health + CONFIG.initial.budgetShares.education) / 100 * CONFIG.initial.govPurchasesReal / CONFIG.initial.gdp * 100) + RE.humanCapital;
	const humanCapitalIndex = clamp(s.humanCapitalIndex + .055 * (humanCapitalTarget - s.humanCapitalIndex) + gauss(.04 * nMult), 55, 200);
	const scienceShareGdp = budgetShares.science / 100 * s.govPurchasesReal / Math.max(1, s.gdp) * 100;
	const baseScience = CONFIG.initial.budgetShares.science / 100 * CONFIG.initial.govPurchasesReal / CONFIG.initial.gdp * 100;
	const tfpGrowth = CONFIG.prod.tfpBase + .45 * (scienceShareGdp - baseScience) + .1 * (s.infrastructureIndex - 100) / 10 - (s.regime === "banking" || s.regime === "debt" ? .35 : 0);
	const productivity = clamp(applyAnnualGrowth(s.productivity, tfpGrowth) + (d.productivity || 0) + gauss(NB.productivity * nMult), 50, 400);
	const govInvShareGdp = (s.govInvestmentReal + (s.projectReal || 0)) / Math.max(1, s.gdp) * 100;
	const baseGovInvShare = CONFIG.initial.govInvestmentReal / CONFIG.initial.gdp * 100;
	const infrastructureIndex = clamp(s.infrastructureIndex + .9 * (govInvShareGdp - baseGovInvShare) - .25 * (s.infrastructureIndex - 100) / 10 + (d.infrastructureIndex || 0) + gauss(.05 * nMult), 50, 220);
	const capitalStock = Math.max(1, s.capitalStock + (s.businessInvestment + s.govInvestmentReal - CONFIG.prod.depreciation / 100 * s.capitalStock) / 4);
	const laborForce = clamp(s.laborForce * (1 + (d.laborForce || 0) / 100), 60, 140);
	const supplyScar = clamp(s.supplyScar * .94 + (d.potentialShock || 0), -18, 6);
	const nairuTarget = T.nairu + .35 * Math.max(0, s.unemployment - T.nairu - 2) + .2 * Math.max(0, s.shadowShare - 14) * .1 + RE.nairu;
	const nairu = clamp(s.nairu + C.nairuHysteresis * (nairuTarget - s.nairu), 3.5, 12);
	const potentialGdp = potentialFrom(capitalStock, laborForce, nairu, humanCapitalIndex, productivity, infrastructureIndex, TFP_SCALE, supplyScar);
	const potentialGrowth = clamp(ema(s.potentialGrowth, annualizedGrowth(s.potentialGdp, potentialGdp), .35), -4, 8);
	const trendReal = potentialGrowth;
	const imfGovSpending = imfActive ? Math.min(decisions.govSpending, -1) : decisions.govSpending;
	const imfTransfers = imfActive ? Math.min(decisions.transfers, -1) : decisions.transfers;
	const imfGovInvestment = imfActive ? Math.min(decisions.govInvestment, 0) : decisions.govInvestment;
	const govPurchasesGrowth = clamp(trendReal + imfGovSpending, -12, 14);
	const transfersGrowth = clamp(trendReal + imfTransfers + (d.transfersPressure || 0) + RE.transfers, -12, 16);
	const govInvestmentGrowth = clamp(trendReal + imfGovInvestment + (d.govInvestmentPush || 0), -16, 20);
	const plannedPurchases = Math.max(1, applyAnnualGrowth(s.govPurchasesReal, govPurchasesGrowth));
	const plannedTransfers = Math.max(1, applyAnnualGrowth(s.transfersReal, transfersGrowth));
	const plannedGovInv = Math.max(1, applyAnnualGrowth(s.govInvestmentReal, govInvestmentGrowth));
	const projRevenue = s.govRevenue * (1 + (s.potentialGrowth + s.inflation) / 400);
	const projInterest = s.govDebt * s.effectiveDebtRate / 100;
	const maxDeficitPct = lockedOutOfMarkets ? clamp(11 - .1 * Math.max(0, s.debtToGdp - 55) - 1.5 * Math.max(0, s.riskPremium - 2), 0, .8) : clamp(11 - .1 * Math.max(0, s.debtToGdp - 55) - 1.5 * Math.max(0, s.riskPremium - 2), .5, 11);
	const allowedPrimary = projRevenue + maxDeficitPct / 100 * s.nominalGdp - projInterest;
	const plannedPrimary = (plannedPurchases + plannedTransfers + plannedGovInv) * s.priceLevel / 100;
	const sequesterFactor = plannedPrimary > allowedPrimary && allowedPrimary > 0 ? clamp(allowedPrimary / plannedPrimary, .9, 1) : 1;
	const floorOf = (share) => share * Math.max(1, s.potentialGdp);
	const govPurchasesReal = Math.max(plannedPurchases * sequesterFactor, floorOf(C.floorPurchasesShare));
	const transfersReal = Math.max(plannedTransfers * (sequesterFactor < 1 ? Math.min(1, sequesterFactor + .05) : 1), floorOf(C.floorTransfersShare));
	const govInvestmentReal = Math.max(plannedGovInv * (sequesterFactor < 1 ? Math.max(.5, sequesterFactor - .05) : 1), floorOf(C.floorGovInvestmentShare));
	const projectReal = RS.projectPct / 100 * s.gdp;
	const eventReal = (RS.eventPct + WC.spendPct + CP.spendPct + AN.spendPct + RV.spendPct + DF.spendPct + GD.spendPct) / 100 * s.gdp;
	if (sequesterFactor < .995) news.push(mkNews("crisis", `СЕКВЕСТР БЮДЖЕТА: РАСХОДЫ УРЕЗАНЫ НА ${fmt1((1 - sequesterFactor) * 100)}%`, `Инвесторы отказываются финансировать дефицит больше ${fmt1(maxDeficitPct)}% ВВП при долге ${fmt1(s.debtToGdp)}% и премии за риск ${fmt1(s.riskPremium)} п.п. Правительство вынуждено резать расходы независимо от своих планов — первыми страдают госинвестиции.`, {
		priority: 10,
		chain: [
			"Долг ↑",
			"Премия за риск ↑",
			"Рынок закрыт",
			"Секвестр расходов",
			"Спад ↑"
		]
	}));
	const actualGrowthG = annualizedGrowth(s.govPurchasesReal, govPurchasesReal);
	const actualGrowthTr = annualizedGrowth(s.transfersReal, transfersReal);
	const actualGrowthIg = annualizedGrowth(s.govInvestmentReal, govInvestmentReal);
	const slack = clamp(-s.outputGap, 0, 6) / 6;
	const mPurchases = C.multPurchases[0] + C.multPurchases[1] * slack;
	const mTransfers = C.multTransfers[0] + C.multTransfers[1] * slack;
	const mInvestment = C.multInvestment[0] + C.multInvestment[1] * slack;
	const mTax = C.multTax[0] + C.multTax[1] * slack;
	const shareG = s.govPurchasesReal / s.gdp;
	const shareTr = s.transfersReal / s.gdp;
	const shareIg = s.govInvestmentReal / s.gdp;
	const wedgeChange = taxWedge(decisions) - taxWedge(s);
	const fiscalImpulse = mPurchases * decisions.govSpending * shareG + mTransfers * decisions.transfers * shareTr + mInvestment * decisions.govInvestment * shareIg - mTax * wedgeChange * .35;
	if (Math.abs(fiscalImpulse) > .05) add("gdpGrowth", `Бюджетный импульс ${fmtSigned1(fiscalImpulse)} п.п. (мультипликатор расходов ${fmt2(mPurchases)} — ${slack > .4 ? "экономика ниже потенциала, деньги доходят до выпуска" : "экономика близка к пределу, эффект уходит в цены"})`, fiscalImpulse);
	const capacityDrag = -C.capacityDrag * Math.pow(Math.max(0, s.outputGap - 1), 1.25);
	const creditRatio = s.creditVolume / Math.max(1, s.nominalGdp);
	const creditImpulse = (creditGrowth - (s.potentialGrowth + s.inflationExpectations)) * creditRatio * C.creditImpulseToDemand;
	const prevU = Number.isFinite(s.prevUnemployment) ? s.prevUnemployment : s.unemployment;
	const employmentGrowthPrev = -(s.unemployment - prevU) * 4;
	const realWageIncome = s.wageGrowth - s.inflation + employmentGrowthPrev;
	const realTransferGrowth = transfersGrowth;
	const capitalIncomeGrowth = s.gdpGrowth - Math.max(0, s.inflation - s.inflationExpectations) + .5 * (s.gdpGrowth - s.potentialGrowth);
	const wedgeDrag = -wedgeChange * .55;
	const realIncomeGrowth = .62 * realWageIncome + .16 * realTransferGrowth + .22 * capitalIncomeGrowth + wedgeDrag;
	const consShareDev = s.consumption / s.potentialGdp / (CONFIG.initial.consumption / CONFIG.initial.gdp) - 1;
	const invShareDev = s.businessInvestment / s.potentialGdp / (CONFIG.initial.businessInvestment / CONFIG.initial.gdp) - 1;
	const consumptionCore = potentialGrowth - 16 * consShareDev + C.consIncome * (realIncomeGrowth - potentialGrowth) - C.consRate * (depositRate - s.inflationExpectations - (rStar - 1)) + C.consConf * (s.consumerConfidence - 55) / 5 + C.consCredit * creditImpulse + .35 * slack * .16 * decisions.transfers + capacityDrag * .6;
	const consumptionGrowth = clamp(C.consInertia * s.consumptionGrowth + (1 - C.consInertia) * consumptionCore + (d.consumption || 0) + gauss(NB.consumption * nMult), -18, 14);
	const investmentCore = potentialGrowth - 24 * invShareDev + C.invAccelerator * (s.gdpGrowth - s.potentialGrowth) - C.invRate * rateGap + C.invConf * (s.businessConfidence - 55) / 5 + C.invCredit * creditImpulse + C.invCrowdIn * decisions.govInvestment * (shareIg / .03) - C.invProfitTax * (decisions.profitTaxRate - s.profitTaxRate) + (creditCrunch ? -2.5 : 0) + capacityDrag;
	const investmentGrowth = clamp(C.invInertia * s.investmentGrowth + (1 - C.invInertia) * investmentCore + (d.investment || 0) + gauss(NB.investment * nMult), -35, 25);
	const rerClamped = clamp(s.realExchangeRate, 40, 250);
	const exportShareTarget = CONFIG.initial.exports / CONFIG.initial.gdp * Math.pow(100 / rerClamped, C.exportShareElasticity);
	const importShareTarget = CONFIG.initial.imports / CONFIG.initial.gdp * Math.pow(rerClamped / 100, C.importShareElasticity);
	const exportShareGap = Math.log(Math.max(1e-6, s.exports / Math.max(1, s.potentialGdp)) / exportShareTarget);
	const importShareGap = Math.log(Math.max(1e-6, s.imports / Math.max(1, s.gdp)) / importShareTarget);
	const exportsGrowth = clamp(.95 + C.exportWorld * worldGdpGrowth + .03 * (worldDemandIndex - 100) - C.exportRer * (s.realExchangeRate - 100) - C.tradeShareAnchor * 100 * exportShareGap + (d.exportsGrowth || 0) + gauss(NB.exports * nMult), -30, 30);
	const importsGrowth = clamp(.15 + C.importIncome * s.gdpGrowth + C.importRer * (s.realExchangeRate - 100) - C.tradeShareAnchor * 100 * importShareGap + (d.importsGrowth || 0) + gauss(NB.imports * nMult), -30, 30);
	const consumption = Math.max(1, applyAnnualGrowth(s.consumption, consumptionGrowth));
	const businessInvestment = Math.max(1, applyAnnualGrowth(s.businessInvestment, investmentGrowth));
	const exports = Math.max(1, applyAnnualGrowth(s.exports, exportsGrowth));
	const imports = Math.max(1, applyAnnualGrowth(s.imports, importsGrowth));
	const gdp = Math.max(1, consumption + businessInvestment + govPurchasesReal + govInvestmentReal + projectReal + eventReal + exports - imports);
	const gdpGrowth = annualizedGrowth(s.gdp, gdp);
	const outputGap = clamp((gdp - potentialGdp) / potentialGdp * 100, -25, 20);
	add("gdpGrowth", `Потребление ${fmtSigned1(consumptionGrowth)}%, инвестиции ${fmtSigned1(investmentGrowth)}%, госсектор ${fmtSigned1(govPurchasesGrowth)}%, чистый экспорт ${fmtMoneySigned(exports - imports)}`, gdpGrowth - s.gdpGrowth);
	if (capacityDrag < -.15) add("gdpGrowth", `Экономика упирается в предел мощностей: часть спроса уходит в цены, а не в выпуск (${fmt1(capacityDrag)} п.п.)`, capacityDrag);
	const unemploymentTarget = nairu - C.okun * outputGap;
	const unemployment = clamp(s.unemployment + C.uAdjust * (unemploymentTarget - s.unemployment) + (d.unemployment || 0) + gauss(NB.unemployment * nMult), 1.5, 30);
	const employment = 100 - unemployment;
	const tightness = nairu - unemployment;
	const vacancyRate = clamp(3 + .95 * tightness + .25 * outputGap, .2, 14);
	add("unemployment", `Разрыв выпуска ${fmtSigned1(outputGap)}% через закон Оукена тянет безработицу к ${fmt1(unemploymentTarget)}%`, unemployment - s.unemployment);
	const trendLaborProductivity = clamp(potentialGrowth - (laborForce / s.laborForce - 1) * 400, -2, 6);
	const wageGrowth = clamp(C.wageExpect * s.inflationExpectations + trendLaborProductivity + C.wageTightness * tightness + .18 * Math.max(0, vacancyRate - 4) - C.wageSocial * (decisions.socialContribRate - s.socialContribRate) + (d.wageGrowth || 0) + gauss(NB.wageGrowth * nMult), Math.min(0, s.wageGrowth * .5), 45);
	const unitLaborCostGrowth = wageGrowth - trendLaborProductivity;
	if (tightness > .4) add("inflation", `Дефицит работников (безработица ${fmt1(unemployment)}% против естественной ${fmt1(nairu)}%) разгоняет зарплаты до ${fmt1(wageGrowth)}%`, C.ulcPass * (unitLaborCostGrowth - s.inflationExpectations));
	const demandPressure = (outputGap < 0 ? .55 : 1) * (C.phillipsLinear * outputGap + C.phillipsConvex * outputGap * Math.abs(outputGap));
	const ulcPressure = C.ulcPass * (unitLaborCostGrowth - s.inflationExpectations);
	const commodityPressure = C.commodityPass * (commodityIndex - s.commodityIndex) * 4;
	const supplyShock = d.inflationSupply || 0;
	const vatPressure = d.vatPrices || 0;
	const inflationPre = s.inflationExpectations + demandPressure + ulcPressure + supplyShock + vatPressure + commodityPressure;
	const carry = decisions.keyRate - s.inflationExpectations - (worldRate - worldInflation) - riskPremium;
	const netCapitalFlow = C.capitalFlowCarry * carry + C.capitalFlowConf * (s.businessConfidence - 55) + C.capitalFlowStab * (s.financialStability - 70) + (d.capitalFlow || 0) + gauss(NB.capitalFlow * nMult) - (s.regime === "debt" || s.regime === "currency" ? 25 : 0);
	const bop = s.exports - s.imports - .012 * s.govDebt + netCapitalFlow;
	const rawPressure = s.inflationExpectations - worldInflation + C.fxBop * (-bop / Math.max(1, s.nominalGdp) * 100) - C.fxCarry * carry;
	const regimeDamp = decisions.fxRegime === "peg" ? .08 : decisions.fxRegime === "managed" ? .45 : 1;
	const fxTarget = decisions.fxRegime === "free" || decisions.fxRegime === "union" ? roundTo(clamp(s.exchangeRate, 20, 1200), 1) : clamp(decisions.fxTarget || s.exchangeRate, 20, 1200);
	const marketDepr = rawPressure + gauss(NB.exchangeRate * nMult);
	const pullToTarget = clamp((fxTarget / Math.max(1, s.exchangeRate) - 1) * 100 * 2, -35, 35);
	const desiredDepr = decisions.fxRegime === "free" ? marketDepr : marketDepr * regimeDamp + pullToTarget * (1 - regimeDamp);
	const gapPct = desiredDepr - marketDepr;
	let defenseIntervention = decisions.fxRegime === "free" ? 0 : gapPct * Math.max(1, s.nominalGdp) / 100 / C.fxBop;
	const reserveYield = s.reserves * worldRate / 100 / 4;
	let unfundedPct = 0;
	const quarterlyNeed = defenseIntervention / 4;
	if (quarterlyNeed < 0 && -quarterlyNeed > s.reserves * .6) {
		const feasible = -s.reserves * .6 * 4;
		unfundedPct = (defenseIntervention - feasible) / (Math.max(1, s.nominalGdp) / 100 / C.fxBop);
		defenseIntervention = feasible;
	}
	const inUnion = decisions.fxRegime === "union";
	if (inUnion) defenseIntervention = 0;
	let depreciationPct = inUnion ? 0 : desiredDepr - unfundedPct + decisions.fxIntervention / Math.max(1, s.nominalGdp) * 100 * 2.5;
	let reserves = Math.max(0, s.reserves + decisions.fxIntervention + defenseIntervention / 4 + reserveYield + (d.reserves || 0) + gauss(NB.reserves * nMult * .3));
	let fxBreak = false;
	if (decisions.fxRegime !== "free" && !inUnion && reserves < .22 * CONFIG.initial.reserves) {
		fxBreak = true;
		depreciationPct += 22;
		reserves = Math.max(reserves, .25 * CONFIG.initial.reserves);
		news.push(mkNews("crisis", "СРЫВ ВАЛЮТНОГО РЕЖИМА: ДЕВАЛЬВАЦИЯ", "Резервы исчерпаны — удержать курс не удалось. Валюта резко девальвирована, импортная инфляция придёт в ближайшие кварталы.", {
			priority: 10,
			chain: [
				"Резервы ↓",
				"Защита курса невозможна",
				"Девальвация",
				"Импортные цены ↑",
				"Инфляция ↑"
			]
		}));
	}
	const exchangeRate = inUnion ? s.exchangeRate : clamp(applyAnnualGrowth(s.exchangeRate, depreciationPct), 20, 1200);
	const fxDeprAnnual = annualizedGrowth(s.exchangeRate, exchangeRate);
	const importPriceInflation = worldInflation + fxDeprAnnual;
	const fxPressureInfl = C.fxPass * fxDeprAnnual + C.worldInflPass * (worldInflation - T.worldInflation);
	if (Math.abs(fxPressureInfl) > .1) add("inflation", `Перенос курса в цены импорта: валюта ${fxDeprAnnual > 0 ? "ослабла" : "укрепилась"} на ${fmt1(Math.abs(fxDeprAnnual))}% годовых`, fxPressureInfl);
	if (Math.abs(depreciationPct) > .5) add("exchangeRate", `Платёжный баланс ${fmtMoneySigned(bop)} и разница реальных ставок (${fmt1(carry)} п.п.) ${bop < 0 ? "давят на" : "поддерживают"} курс`, depreciationPct);
	const inflationRaw = inflationPre + fxPressureInfl + (d.inflation || 0) + gauss(NB.inflation * nMult);
	const inflation = clamp(inflationRaw >= 0 ? inflationRaw : inflationRaw * .35, -10, 90);
	const coreInflation = clamp(s.inflationExpectations + demandPressure + ulcPressure * .9, -10, 90);
	add("inflation", `Ожидания ${fmt1(s.inflationExpectations)}% + давление спроса ${fmtSigned1(demandPressure)} п.п. + издержки труда ${fmtSigned1(ulcPressure)} п.п.`, inflation - s.inflation);
	if (Math.abs(supplyShock) > .1) add("inflation", "Шок предложения: издержки выросли при падении выпуска", supplyShock);
	const prevStab = Number.isFinite(s.stabilizationCred) ? s.stabilizationCred : 0;
	const highInflation = s.inflation >= infTarget + 8 || prevStab > .05 && s.inflation > infTarget + 2;
	const moneyPillar = decisions.keyRate - s.inflationExpectations >= 3 && (decisions.moneySupplyOp || 0) <= 0 && !decisions.emergency;
	const budgetPillar = (Number.isFinite(s.budgetBalancePctGdp) ? s.budgetBalancePctGdp : 0) >= -3 || fiscalImpulse <= -.3;
	const anchorPillar = decisions.fxRegime !== "free" && s.reserves >= .5 * CONFIG.initial.reserves;
	let stabilizationCred = prevStab;
	if (!highInflation) stabilizationCred = prevStab * .7;
	else if (!moneyPillar) stabilizationCred = prevStab * .35;
	else stabilizationCred = prevStab + (budgetPillar ? .3 : .1) + (anchorPillar ? .1 : 0);
	stabilizationCred = clamp(stabilizationCred, 0, 1);
	if (stabilizationCred < .02) stabilizationCred = 0;
	if (highInflation && prevStab < .5 && stabilizationCred >= .5) news.push(mkNews("cb", "СТАБИЛИЗАЦИОННАЯ ПРОГРАММА: РЫНКИ ПОВЕРИЛИ", `Жёсткая ставка${budgetPillar ? " и бюджет без дыры" : ""}${anchorPillar ? " при удерживаемом курсе" : ""} убеждают, что деньги перестанут обесцениваться. Ожидания начали падать быстрее самих цен.`, {
		priority: 8,
		chain: [
			"Реальная ставка ↑",
			budgetPillar ? "Дефицит под контролем" : "Бюджет отстаёт",
			"Доверие к программе ↑",
			"Ожидания ↓",
			"Инфляция ↓"
		]
	}));
	else if (prevStab >= .5 && highInflation && !moneyPillar) news.push(mkNews("cb", "СТАБИЛИЗАЦИЯ СОРВАНА: ДОВЕРИЕ ПОТЕРЯНО", "Денежные условия ослаблены раньше, чем инфляция побеждена. Рынок помнит такие программы — второй раз поверят не скоро.", {
		priority: 9,
		chain: [
			"Ставка ↓ / эмиссия",
			"Программа сорвана",
			"Ожидания ↑",
			"Инфляция ↑"
		]
	}));
	const stabilizationWon = !!s.stabilizationWon || prevStab >= .6 && s.inflation > infTarget + 3 && inflation <= infTarget + 3;
	const stabilizationBonus = stabilizationWon && !s.stabilizationWon ? 15 : 0;
	if (stabilizationBonus) news.push(mkNews("gov", "ЦЕНЫ ОСТАНОВЛЕНЫ: СТАБИЛИЗАЦИЯ УДАЛАСЬ", `Инфляция ${fmt1(inflation)}% при цели ${fmt1(infTarget)}% — впервые за долгое время ценники перестали меняться каждую неделю. Цена победы — рецессия, но её страна готова простить тем, кто вернул деньгам смысл.`, {
		priority: 10,
		chain: [
			"Жёсткая ставка",
			"Бюджет под контролем",
			"Доверие к программе",
			"Ожидания ↓",
			"Цены остановлены",
			"Рейтинг ↑"
		]
	}));
	const mandateTotal = Number.isFinite(s.crisisMandateTotal) ? s.crisisMandateTotal : 0;
	const mandatePrev = Number.isFinite(s.crisisMandateLeft) ? s.crisisMandateLeft : 0;
	const programOn = stabilizationCred >= .3;
	const earlyMandate = mandatePrev > mandateTotal - 2;
	const mandateRefill = stabilizationBonus > 0 && mandateTotal > 0;
	const mandateBase = mandateRefill ? mandateTotal : mandatePrev;
	const crisisMandateLeft = mandateBase > 0 ? Math.max(0, mandateBase - (programOn || earlyMandate || stabilizationWon ? 1 : 2)) : 0;
	const mandateEffect = mandateTotal > 0 ? mandateBase / mandateTotal * (stabilizationWon ? 1 : .35 + .65 * stabilizationCred) : 0;
	if (mandateRefill) news.push(mkNews("gov", "СТРАНА ДАЁТ ВРЕМЯ ТЕМ, КТО ОСТАНОВИЛ ЦЕНЫ", "Мандат правительства национального спасения продлён: люди готовы пережить рецессию, раз деньги снова что-то значат. Но это последний кредит — дальше судят по работе и зарплатам.", { priority: 8 }));
	else if (mandateBase > 0 && crisisMandateLeft === 0) news.push(mkNews("gov", programOn ? "МАНДАТ СПАСЕНИЯ ИСЧЕРПАН — ДАЛЬШЕ СУДЯТ ПО ЦЕНАМ" : "ТЕРПЕНИЕ КОНЧИЛОСЬ: МАНДАТ СПАСЕНИЯ СГОРЕЛ", programOn ? "Кредит доверия, выданный правительству национального спасения, исчерпан. Дальше поддержку определяют не обещания, а ценники и занятость." : "Правительству давали время, чтобы остановить цены. Время вышло раньше, чем программа заработала.", { priority: 8 }));
	const inflDev = Math.abs(inflation - infTarget);
	const adaptSpeed = Math.max(clamp(C.expAdaptMin + (C.expAdaptMax - C.expAdaptMin) * clamp(inflDev / 6, 0, 1) * (1 - s.cbCredibility / 140), .08, .55), .2 + .35 * stabilizationCred);
	const anchorWeight = Math.max(clamp(s.cbCredibility / 100 * (1 - clamp((inflDev - 2) / 8, 0, .6)), .05, .95), .75 * stabilizationCred);
	const expTarget = anchorWeight * infTarget + (1 - anchorWeight) * (.75 * inflation + .25 * s.inflationExpectations);
	const expShock = clamp(.32 * Math.max(0, supplyShock) + .055 * Math.max(0, Math.abs(fxDeprAnnual) - 6) + (activeCrisesPre.indexOf("currency") >= 0 ? .5 : 0) + (activeCrisesPre.indexOf("banking") >= 0 ? .25 : 0) + (decisions.emergency ? .5 : 0) + .25 * Math.max(0, inflation - s.inflation - 1) + (Math.abs(targetChange) > .01 ? targetChange * .6 : 0) - (s.cbCredibility > 75 ? .2 : 0) - (s.cbCredibility > 88 ? .1 : 0) + GUID.expDelta, -.8, 2.4) * (1 - .5 * stabilizationCred);
	const inflationExpectations = clamp(s.inflationExpectations + adaptSpeed * (expTarget - s.inflationExpectations) + expShock + gauss(.1 * nMult), -5, 40);
	if (Math.abs(expShock) > .08) add("inflation", `Событийный сдвиг ожиданий ${fmtSigned1(expShock)} п.п.: люди и бизнес пересматривают свои прогнозы не по статистике, а по заголовкам — ${supplyShock > .1 ? "шок издержек" : Math.abs(fxDeprAnnual) > 6 ? "движение курса" : decisions.emergency ? "эмиссионная поддержка банков" : Math.abs(targetChange) > .01 ? "смена цели ЦБ" : "резкий скачок цен"} виден всем`, expShock);
	const stanceCorrect = sign(policyStance) === sign(inflation - infTarget) || inflDev < 1;
	const credDrift = (inflDev < 1.5 ? .75 : -.45 * Math.min(4, inflDev / 1.5)) + (stanceCorrect ? .3 : -.35) - (decisions.emergency ? .7 : 0) - (decisions.moneySupplyOp > 3 ? .8 : 0) - (s.cbCredibility - 60) * .02;
	const cbCredibility = clamp(s.cbCredibility + credDrift * .55 - Math.abs(targetChange) * 9 + (d.cbCredibilityPush || 0) + GUID.credDelta + gauss(.5 * nMult), 0, 100);
	const priceLevel = Math.max(10, applyAnnualGrowth(s.priceLevel, inflation));
	const nominalGdp = Math.max(1, gdp * priceLevel / 100);
	const realExchangeRate = clamp(s.realExchangeRate * (1 + (inflation - worldInflation - fxDeprAnnual) / 400), 45, 260);
	const creditTrendRatio = ema(s.creditTrendRatio, creditVolume / nominalGdp * 100, .05);
	const creditGap = creditVolume / nominalGdp * 100 - creditTrendRatio;
	const creditGapLag = ema(Number.isFinite(s.creditGapLag) ? s.creditGapLag : 0, creditGap, .12);
	const nplTarget = clamp(1.8 + C.nplRate * Math.max(0, realLendingRate - rStar - 1) + C.nplUnemp * Math.max(0, unemployment - nairu) + C.nplGap * Math.max(0, -outputGap) + C.nplCreditBoom * Math.max(0, s.creditGapLag), .8, 35);
	const bankNPL = clamp(s.bankNPL + C.nplAdjust * (nplTarget - s.bankNPL) + (d.bankNPL || 0) + gauss(NB.bankNPL * nMult), .4, 40);
	const loanLosses = creditVolume * (bankNPL / 100) * T.lgd * .25;
	const interestMargin = creditVolume * (lendingRate - depositRate) / 100 / 4;
	const opCost = .004 * creditVolume;
	const bankProfit = interestMargin - loanLosses - opCost;
	const rwa = Math.max(1, creditVolume * T.riskWeight);
	let bankCapital = Math.max(1, s.bankCapital + bankProfit + (d.bankCapital || 0) + (decisions.emergency ? .12 * s.bankCapital + .024 * rwa : 0));
	const capitalTarget = (decisions.capitalRequirement + 3.5) / 100 * rwa;
	if (bankCapital < capitalTarget) {
		const appetite = clamp((s.businessConfidence - 35) / 30, .05, 1) * clamp((s.financialStability - 30) / 40, .05, 1);
		bankCapital += .16 * (capitalTarget - bankCapital) * appetite;
	}
	let bankCapitalAdequacy = bankCapital / rwa * 100;
	if (bankCapitalAdequacy > decisions.capitalRequirement + 4.5) {
		const excess = (bankCapitalAdequacy - decisions.capitalRequirement - 4.5) / 100 * rwa;
		bankCapital -= excess * .3;
		bankCapitalAdequacy = bankCapital / rwa * 100;
	}
	const liquidityInjectionPctGdp = (decisions.liquidity || 0) / Math.max(1, s.nominalGdp) * 100;
	const bankLiquidity = clamp(s.bankLiquidity + .09 * (75 - s.bankLiquidity) - Math.max(0, bankNPL - 6) * 1.1 - Math.max(0, -creditGrowth) * .25 + liquidityInjectionPctGdp * 18 + (d.bankLiquidity || 0) - (decisions.reserveReq - s.reserveReq) * 1.2 + (decisions.emergency ? 22 : 0) + gauss(.9 * nMult), 0, 100);
	const bankingRisk = clamp(ema(s.bankingRisk, clamp(.5 * clamp(bankNPL * 4.5, 0, 100) + .28 * clamp(100 - bankLiquidity, 0, 100) + .22 * clamp((decisions.capitalRequirement + 3 - bankCapitalAdequacy) * 9, 0, 100), 0, 100), .4), 0, 100);
	if (bankProfit < 0) add("banking", `Убытки банков ${fmtMoney(-bankProfit)} за квартал съедают капитал: достаточность ${fmt1(bankCapitalAdequacy)}% при требовании ${fmt1(decisions.capitalRequirement)}%`, bankProfit);
	if (nplTarget > s.bankNPL + .5) add("banking", `Дорогой кредит и слабый выпуск повышают неплатежи: просрочка идёт к ${fmt1(nplTarget)}%`, nplTarget - s.bankNPL);
	const financialStability = clamp(s.financialStability + .1 * (T.neutralStability - s.financialStability) - Math.max(0, bankingRisk - 50) * .1 - Math.max(0, s.debtToGdp - 90) * .04 - Math.max(0, creditGap - 8) * .25 + (decisions.emergency ? 14 : 0) + liquidityInjectionPctGdp * 5 + (d.financialStability || 0) + gauss(NB.financialStability * nMult), 0, 100);
	const fundIncome = (s.sovereignFund || 0) * (worldRate + 1) / 100 / 4;
	const stateForTax = {
		nominalGdp,
		consumption,
		priceLevel,
		outputGap,
		unemployment,
		shadowShare: s.shadowShare
	};
	const wedgeNow = taxWedge(decisions);
	const shadowTarget = clamp(9 + .55 * (wedgeNow - 32) + .1 * Math.max(0, 55 - s.govTrust) + .06 * Math.max(0, unemployment - 6) * 5, 4, 45);
	const shadowShare = clamp(s.shadowShare + .07 * (shadowTarget - s.shadowShare), 3, 50);
	const revenueParts = computeRevenue({
		...stateForTax,
		shadowShare
	}, decisions);
	const govRevenue = Math.max(1, revenueParts.total + fundIncome * 4 + (d.revenue || 0));
	const revenuePctGdp = govRevenue / nominalGdp * 100;
	add("budget", `Налоговая база: теневая экономика ${fmt1(shadowShare)}%, собираемость подстраивается под нагрузку (налоговый клин ${fmt1(wedgeNow)})`, govRevenue - s.govRevenue);
	const govPurchasesNominal = (govPurchasesReal + eventReal) * priceLevel / 100;
	const transfersNominal = transfersReal * priceLevel / 100;
	const govInvestmentNominal = (govInvestmentReal + projectReal) * priceLevel / 100;
	const newDebtRate = .35 * decisions.keyRate + .65 * (rStar + inflationExpectations + 1) + riskPremium + C.debtLevelPremium * Math.max(0, s.debtToGdp - 60);
	const effectiveDebtRate = clamp(s.effectiveDebtRate + C.debtRollover * (newDebtRate - s.effectiveDebtRate), 0, 45);
	const interestPayment = s.govDebt * effectiveDebtRate / 100;
	const govSpendingTotal = govPurchasesNominal + transfersNominal + govInvestmentNominal + interestPayment;
	const budgetBalance = govRevenue - govSpendingTotal;
	const primaryBalance = budgetBalance + interestPayment;
	let govDebt = sovereignDefault ? s.govDebt * .55 : s.govDebt;
	let sovereignFund = s.sovereignFund || 0;
	const flow = budgetBalance / 4;
	if (flow >= 0) {
		const repay = Math.min(govDebt, flow);
		govDebt -= repay;
		sovereignFund += flow - repay;
	} else {
		const draw = Math.min(sovereignFund, -flow * .65);
		sovereignFund -= draw;
		govDebt += -flow - draw;
	}
	const bondIssuance = Math.max(0, decisions.bondIssuance || 0);
	govDebt += bondIssuance;
	sovereignFund += bondIssuance;
	govDebt = Math.max(0, govDebt);
	const debtToGdp = govDebt / nominalGdp * 100;
	const fundPctGdp = sovereignFund / nominalGdp * 100;
	const netDebtToGdp = (govDebt - sovereignFund) / nominalGdp * 100;
	const budgetBalancePctGdp = budgetBalance / nominalGdp * 100;
	const structuralBalancePctGdp = budgetBalancePctGdp + .45 * outputGap;
	const dRev = govRevenue - s.govRevenue;
	const dSpend = govSpendingTotal - s.govSpendingTotal;
	const dInt = interestPayment - s.interestPayment;
	add("budget", `Доходы ${fmtMoneySigned(dRev)} (номинальный ВВП ${fmtSigned1(annualizedGrowth(s.nominalGdp, nominalGdp))}%, теневая экономика ${fmt1(shadowShare)}%${Math.abs(fundIncome) > .5 ? `, доход фонда ${fmtMoney(fundIncome * 4)}` : ""}), расходы ${fmtMoneySigned(dSpend)} (из них проценты ${fmtMoneySigned(dInt)}) — итог ${fmtSigned1(budgetBalancePctGdp - s.budgetBalancePctGdp)} п.п. ВВП`, budgetBalancePctGdp - s.budgetBalancePctGdp);
	if (sovereignFund > 1) add("budget", `Суверенный фонд ${fmtMoney(sovereignFund)} (${fmt1(fundPctGdp)}% ВВП) приносит ${fmtMoney(fundIncome * 4)} в год и гасит будущие дефициты до обращения к рынку`, fundPctGdp);
	if (interestPayment - s.interestPayment > 1) add("budget", `Стоимость обслуживания долга выросла до ${fmtMoney(interestPayment)} в год (ставка ${fmt1(effectiveDebtRate)}%)`, -(interestPayment - s.interestPayment));
	const currentAccount = exports - imports - .012 * govDebt;
	const capitalAccount = netCapitalFlow;
	const fdi = clamp(s.fdi + (d.fdi || 0) + .35 * (s.businessConfidence - 55) + .2 * (financialStability - 70) - .8 * (decisions.capitalTaxRate - s.capitalTaxRate) + gauss(NB.fdi * nMult), -120, 500);
	const consumerConfidence = clamp(s.consumerConfidence + .11 * (T.neutralConfidence - s.consumerConfidence) + .3 * (wageGrowth - inflation) - .35 * Math.max(0, unemployment - nairu) - .25 * Math.max(0, inflation - 6) + 3.5 * stabilizationCred + (d.consumerConfidence || 0) + gauss(NB.consumerConfidence * nMult), 0, 100);
	const businessConfidence = clamp(s.businessConfidence + .11 * (T.neutralConfidence - s.businessConfidence) + .32 * (gdpGrowth - potentialGrowth) - .06 * Math.max(0, bankingRisk - 50) - .25 * Math.max(0, rateGap) * (1 - .7 * stabilizationCred) + 3.5 * stabilizationCred + (d.businessConfidence || 0) + gauss(NB.businessConfidence * nMult), 0, 100);
	const ignoredDemands = (s.demands || []).filter((x) => x.quartersActive >= 4).length;
	const govTrust = clamp(s.govTrust + .3 * ((budgetBalancePctGdp > -4 ? .4 : -.5) + (gdpGrowth > 1 ? .3 : -.3) - .25 * Math.max(0, inflation - 6) - .3 * Math.max(0, unemployment - 7) - ignoredDemands * .5) + (d.govTrust || 0) + gauss(.5 * nMult), 0, 100);
	const moneySupply = clamp(applyAnnualGrowth(s.moneySupply, potentialGrowth + inflation) * (1 + (decisions.moneySupplyOp || 0) / 100) + liquidityInjectionPctGdp * .4 + (decisions.emergency ? 3 : 0), 20, 4e3);
	const neutralNominal = rStar + inflationExpectations;
	const sovereignExtra = C.debtLevelPremium * Math.max(0, debtToGdp - 60);
	const yieldAt = (h) => {
		const w = clamp(h / 5, 0, 1);
		return clamp(decisions.keyRate * (1 - w) + neutralNominal * w + GUID.bias * Math.min(1, h) * (1 - w) + .25 * Math.sqrt(h) + riskPremium * (.1 + .07 * h) + sovereignExtra * (.2 + .08 * h), -2, 60);
	};
	const yield3m = yieldAt(.25);
	const yield1y = yieldAt(1);
	const yield2y = yieldAt(2);
	const yield5y = yieldAt(5);
	const yield10y = yieldAt(10);
	const curveSlope = yield10y - yield3m;
	const curveInverted = curveSlope < -.15;
	const prevY10 = Number.isFinite(s.yield10y) ? s.yield10y : yield10y;
	const bondReturn = prevY10 / 4 - 7.4 * (yield10y - prevY10);
	const bondIndex = Math.max(5, (Number.isFinite(s.bondIndex) ? s.bondIndex : 1e3) * (1 + bondReturn / 100));
	const sovereignSpread = Math.max(0, (riskPremium + sovereignExtra) * 100);
	const corporateSpread = Math.max(20, (riskPremium * .8 + .32 * Math.max(0, bankNPL - 3) + .35 * Math.max(0, -outputGap) + .02 * Math.max(0, bankingRisk - 40)) * 100);
	const earnings = Math.max(1, CONFIG.shares.profits * nominalGdp * (1 - decisions.profitTaxRate / 100) * clamp(1 + 1.7 * outputGap / 100, .25, 2.2));
	const equityRiskPremium = clamp(3.2 + .055 * Math.max(0, bankingRisk - 40) + .04 * Math.max(0, (s.currencyRisk || 20) - 30) + .55 * Math.max(0, -outputGap) - .28 * (businessConfidence - 55) / 5 + (activeCrisesPre.length ? 1.6 : 0), 1.2, 16);
	const growthTerm = clamp((potentialGrowth + inflationExpectations) * .62, 0, 9);
	const discountRate = clamp(yield10y + equityRiskPremium - growthTerm, 1.1, 32);
	const fairPE = clamp(100 / discountRate, 3, 38);
	const fairIndex = earnings * fairPE / STOCK_NORM;
	const prevStock = Number.isFinite(s.stockIndex) ? s.stockIndex : 1e3;
	const stockIndex = Math.max(30, ema(prevStock, fairIndex, .42) * (1 + ((d.stockShock || 0) + gauss(1.6 * nMult)) / 100));
	const stockReturn = (stockIndex / prevStock - 1) * 100;
	const stockPE = stockIndex * STOCK_NORM / earnings;
	const marketCap = stockIndex / 1e3 * 1100;
	const marketCapPctGdp = marketCap / nominalGdp * 100;
	const netInterestMarginPre = lendingRate - depositRate;
	const prevLending = Number.isFinite(s.lendingRate) ? s.lendingRate : lendingRate;
	const sect = (prev, drift) => Math.max(45, (Number.isFinite(prev) ? prev : 1e3) * (1 + clamp(drift, -16, 16) / 100));
	const sectorBanks = sect(s.sectorBanks, stockReturn * 1.3 - .45 * Math.max(0, bankNPL - 3) - .12 * Math.max(0, bankingRisk - 45) + .25 * (netInterestMarginPre - 3.4) + (d.secBanks || 0));
	const sectorIndustry = sect(s.sectorIndustry, stockReturn * 1.05 + .35 * (investmentGrowth - potentialGrowth) - .22 * rateGap + (d.secIndustry || 0));
	const sectorConsumer = sect(s.sectorConsumer, stockReturn * .85 + .45 * (wageGrowth - inflation) + .06 * (consumerConfidence - 55) + (d.secConsumer || 0));
	const sectorResources = sect(s.sectorResources, stockReturn * .7 + .14 * (commodityIndex - s.commodityIndex) + .18 * fxDeprAnnual + (d.secResources || 0));
	const reitIndex = sect(s.reitIndex, stockReturn * .55 - 1.35 * (lendingRate - prevLending) - .45 * rateGap + .5 * (wageGrowth - inflation) + .12 * creditGrowth + (d.secReit || 0));
	const netInterestMargin = netInterestMarginPre;
	const bankROE = bankProfit * 4 / Math.max(1, bankCapital) * 100;
	const bankPB = clamp(.35 + bankROE / 22 - Math.max(0, bankNPL - 4) * .07 - Math.max(0, bankingRisk - 50) * .012, .08, 2.6);
	const depositIndex = Math.max(1, (Number.isFinite(s.depositIndex) ? s.depositIndex : 100) * (1 + depositRate / 400));
	const fxIndex = Math.max(1, exchangeRate * (1 + worldRate / 400) * (Number.isFinite(s.fxCarry) ? s.fxCarry : 1));
	const fxCarry = (Number.isFinite(s.fxCarry) ? s.fxCarry : 1) * (1 + worldRate / 400);
	const corpYield = yield5y + corporateSpread / 100;
	const prevCorpYield = Number.isFinite(s.corpYield) ? s.corpYield : corpYield;
	const corpReturn = prevCorpYield / 4 - 4.1 * (corpYield - prevCorpYield) - Math.max(0, bankNPL - 3) * .12;
	const corpBondIndex = Math.max(5, (Number.isFinite(s.corpBondIndex) ? s.corpBondIndex : 1e3) * (1 + corpReturn / 100));
	const goldIndex = Math.max(5, commodityIndex * exchangeRate / 100);
	const prevY2 = Number.isFinite(s.yield2y) ? s.yield2y : yield2y;
	const shortBondReturn = prevY2 / 4 - 1.9 * (yield2y - prevY2);
	const bondShortIndex = Math.max(5, (Number.isFinite(s.bondShortIndex) ? s.bondShortIndex : 1e3) * (1 + shortBondReturn / 100));
	const linkerReal = clamp(yield5y - inflationExpectations, -3, 12);
	const linkerIndex = Math.max(5, (Number.isFinite(s.linkerIndex) ? s.linkerIndex : 1e3) * (1 + (inflation + linkerReal) / 4 / 100));
	const moneyMarketIndex = Math.max(1, (Number.isFinite(s.moneyMarketIndex) ? s.moneyMarketIndex : 1e3) * (1 + decisions.keyRate / 400));
	const worldEquityReturn = clamp((worldGdpGrowth - 1.2) * 1.6 + (worldDemandIndex - s.worldDemandIndex) * .35 + fxDeprAnnual / 4 + gauss(2.2 * nMult), -18, 18);
	const worldEquityIndex = Math.max(20, (Number.isFinite(s.worldEquityIndex) ? s.worldEquityIndex : 1e3) * (1 + worldEquityReturn / 100));
	const fxVolatility = clamp(ema(Number.isFinite(s.fxVolatility) ? s.fxVolatility : 6, Math.abs(fxDeprAnnual) * 1.6 + 3, .3), 1, 60);
	const volatilityIndex = clamp(ema(Number.isFinite(s.volatilityIndex) ? s.volatilityIndex : 16, 11 + 2.6 * Math.abs(stockReturn) + .5 * fxVolatility + .16 * bankingRisk + (activeCrisesPre.length ? 16 : 0), .38), 5, 100);
	const inflationPain = saturating(Math.max(0, inflation - infTarget), 2.2, 10);
	const stabilizationRelief = stabilizationCred > .3 ? 12 * stabilizationCred * clamp((s.inflation - inflation) / 3, 0, 1) : 0;
	const approvalTarget = clamp(50 + 2.4 * (wageGrowth - inflation) - 3.6 * (unemployment - nairu) - inflationPain + stabilizationRelief + 25 * mandateEffect + .22 * (govTrust - 55) + .18 * (consumerConfidence - 55) + 1.6 * (gdpGrowth - potentialGrowth), 0, 100);
	const prevRegimeForGroups = s.politicalRegime || "democracy";
	const groupMemoryNew = [];
	pres.applied.forEach((id) => {
		const a = PRES_BY_ID[id];
		const label = typeof a.label === "function" ? a.label(s) : a.label;
		groupMemoryNew.push(...groupMemoryOf(ACTION_GROUP_EFFECTS[id], label, a.group === "reform" ? 16 : 10));
	});
	const res = RS.lastRegionResolution;
	if (res && res.q === quarterIndex) {
		const tone = ((REGION_EVENT_BY_ID[res.id] || { options: [] }).options.find((o) => o.id === res.option) || {}).tone;
		if (res.byDefault || tone === "wait") groupMemoryNew.push(...groupMemoryOf({ regions: -3 }, `${res.title}: ответа не было`, 8));
		else if (tone === "generous") groupMemoryNew.push(...groupMemoryOf({ regions: 3 }, res.title, 8));
		else if (tone === "hard") groupMemoryNew.push(...groupMemoryOf({
			youth: -3,
			siloviki: 2
		}, res.title, 8));
	}
	if (sovereignDefault) groupMemoryNew.push(...groupMemoryOf({
		business: -15,
		pensioners: -8,
		public: -8
	}, "Дефолт", 12));
	groupMemoryNew.push(...GD.memory);
	if (RV.lost.length) groupMemoryNew.push(...groupMemoryOf({
		siloviki: -8,
		pensioners: -3
	}, "Потеря новых земель", 10));
	if (PC.returned.length) groupMemoryNew.push(...groupMemoryOf({ siloviki: -10 }, "Земли возвращены Норланду", 12));
	if (PC.treaty && PC.treaty !== s.treaty && PC.treaty.recognized) groupMemoryNew.push(...groupMemoryOf({ business: 6 }, "Граница признана", 10));
	const groupStress = activeRegions(s).map((r) => regionStress(r, s));
	const DIST = distributionStep(s.distribution, {
		wageGrowth,
		unemployment,
		prevUnemployment: s.unemployment,
		transfersRealGrowth: actualGrowthTr,
		inflation,
		coreInflation,
		gdpGrowth,
		stockGrowth: stockReturn,
		keyRate: decisions.keyRate,
		vatRate: decisions.vatRate,
		incomeTaxRate: decisions.incomeTaxRate,
		capitalTaxRate: decisions.capitalTaxRate
	});
	const GS = groupStep(s, {
		distribution: DIST,
		approvalTarget,
		push: (d.approvalPush || 0) + stabilizationBonus,
		newMemory: groupMemoryNew,
		inflation,
		infTarget,
		unemployment,
		nairu,
		wageGrowth,
		decisions,
		budgetShares: s.budgetShares,
		businessConfidence,
		offensiveWar: (s.warQuartersLeft || 0) > 0 && s.warType === "offensive",
		atWar: (s.warQuartersLeft || 0) > 0,
		repression: prevRegimeForGroups === "totalitarian" ? 1 : prevRegimeForGroups === "authoritarian" ? .55 : 0,
		avgStress: groupStress.reduce((a, b) => a + b, 0) / (groupStress.length || 1),
		projects: (s.projects || []).length
	});
	const approval = GS.approval;
	const GE = groupEpisodes(s, GS.support, difficulty);
	GE.news.forEach(([cat, h, t, pr]) => news.push(mkNews(cat, h, t, { priority: pr })));
	nextQueue.push(...GE.impulses);
	const prevToElection = Number.isFinite(s.quartersToElection) ? s.quartersToElection : CONFIG.election.cycle;
	const noElections = (s.politicalRegime || "democracy") === "totalitarian";
	let quartersToElection = noElections ? prevToElection : prevToElection - 1;
	if (pres.patch.snapElection) quartersToElection = Math.min(quartersToElection, pres.patch.snapElection);
	let term = s.term || 1;
	let electionResult = null;
	let lastElection = s.lastElection || null;
	let mandate = s.mandate || null;
	let governmentLine = s.governmentLine || "centrist";
	const riggedElection = s.politicalRegime === "authoritarian" || s.politicalRegime === "totalitarian";
	const campaign = !noElections && quartersToElection <= CONFIG.election.campaign && quartersToElection > 0;
	if (campaign && !s.campaignActive) {
		if (riggedElection) news.push(mkNews("gov", "НАЗНАЧЕНА ДАТА ГОЛОСОВАНИЯ", `До официальной даты ${quartersToElection} кв. Исход не обсуждается — обсуждается только явка.`, { priority: 5 }));
		else {
			nextQueue.push(makeImpulse("businessConfidence", -6, "Предвыборная неопределённость: бизнес откладывает решения", "default", difficulty, "other"));
			nextQueue.push(makeImpulse("investment", -1.6, "Предвыборная неопределённость", "default", difficulty));
			nextQueue.push(makeImpulse("riskPremium", .25, "Политическая неопределённость перед выборами", "default", difficulty));
			news.push(mkNews("gov", `НАЧАЛАСЬ ПРЕДВЫБОРНАЯ КАМПАНИЯ: ДО ГОЛОСОВАНИЯ ${quartersToElection} КВ.`, `Рейтинг власти ${Math.round(approval)} из 100 при безработице ${fmt1(unemployment)}% и инфляции ${fmt1(inflation)}%. Инвесторы берут паузу до результата, а правительство — наоборот, тратит: политический цикл всегда заканчивается счётом, который оплачивают уже после выборов.`, {
				priority: 8,
				chain: [
					"Кампания",
					"Неопределённость ↑",
					"Инвестиции ↓",
					"Расходы бюджета ↑",
					"Счёт после выборов"
				]
			}));
		}
	}
	let promiseScore = 0;
	let promisesKept = 0;
	let promisesTotal = 0;
	if (quartersToElection <= 0 && !noElections && Array.isArray(decisions.promises) && decisions.promises.length) {
		promisesTotal = decisions.promises.length;
		const atVote = {
			...s,
			inflation,
			unemployment,
			debtToGdp,
			gdp,
			exchangeRate,
			reserves,
			budgetBalancePctGdp
		};
		decisions.promises.forEach((pr) => {
			if (evaluatePromise(pr, atVote).met) promisesKept += 1;
		});
		promiseScore = (promisesKept - (promisesTotal - promisesKept)) * 2.2;
	}
	let voteShare = quartersToElection <= 0 && !noElections ? clamp(50 + (approval - 50 + groupTurnoutShift(s)) * .85 + 2.5 + promiseScore + gauss(2.2 * nMult), 0, 100) : null;
	let campaignRegions = null;
	if (voteShare != null && !riggedElection && Object.keys(CP.spend).length) {
		campaignRegions = regionVoteShares(s, voteShare, false).map((r) => ({
			id: r.id,
			share: clamp(r.share + campaignBonus(CP.spend[r.id], r.share), 0, 100)
		}));
		voteShare = campaignRegions.reduce((a, b) => a + b.share, 0) / campaignRegions.length;
	}
	let coup = false;
	if (quartersToElection <= 0 && !noElections) {
		const margin = voteShare - 50;
		if (!riggedElection && margin < 0) {
			const severity = clamp(-margin, 0, 50) / 50;
			const priorTension = clamp(Number.isFinite(s.politicalTension) ? s.politicalTension : 8, 0, 100);
			const coupChance = clamp(Math.pow(severity, 1.6) * .6 + priorTension / 100 * .25, 0, .75);
			coup = !kids && rng() < coupChance;
		}
		electionResult = riggedElection || coup ? "incumbent" : margin >= 0 ? "incumbent" : voteShare < 42 ? "landslide" : "opposition";
		const byRegion = campaignRegions || regionVoteShares(s, voteShare, riggedElection);
		lastElection = {
			q: quarterIndex,
			qLabel: quarterLabel(quarterIndex),
			result: electionResult,
			rigged: !!riggedElection,
			coup,
			nationalShare: byRegion.reduce((a, b) => a + b.share, 0) / (byRegion.length || 1),
			byRegion
		};
		const sortedRegions = [...byRegion].sort((a, b) => b.share - a.share);
		const nameOf = (id) => (regionById(id) || {}).name || id;
		const geoLine = riggedElection ? ` По областям результат тоже ровный: от ${fmt1(sortedRegions[sortedRegions.length - 1].share)}% до ${fmt1(sortedRegions[0].share)}%.` : ` Лучший результат — ${nameOf(sortedRegions[0].id)} (${fmt1(sortedRegions[0].share)}%), худший — ${nameOf(sortedRegions[sortedRegions.length - 1].id)} (${fmt1(sortedRegions[sortedRegions.length - 1].share)}%).`;
		quartersToElection = CONFIG.election.cycle;
		term += 1;
		if (electionResult === "incumbent") {
			nextQueue.push(makeImpulse("businessConfidence", 4, "Преемственность политики после выборов", "default", difficulty, "other"));
			news.push(riggedElection ? mkNews("gov", "ВЫБОРЫ БЕЗ НЕОЖИДАННОСТЕЙ: РЕЗУЛЬТАТ БЛИЗОК К ЕДИНОГЛАСНОМУ", `Официально — явка рекордная, поддержка почти абсолютная. Независимые наблюдатели на участки не допущены, альтернативных кандидатов не зарегистрировано.${geoLine}`, { priority: 9 }) : coup ? mkNews("gov", "ПЕРЕВОРОТ: ВЛАСТЬ НЕ ПРИЗНАЛА ПОРАЖЕНИЕ НА ВЫБОРАХ", `Рейтинг ${Math.round(approval)} из 100 не оставлял шансов на честную победу. Вместо передачи власти объявлено чрезвычайное положение: результаты аннулированы, парламент распущен, оппозиция объявлена вне закона.`, {
				priority: 10,
				chain: [
					"Разгромное поражение",
					"Отказ признать результат",
					"Чрезвычайное положение",
					"Авторитарный поворот"
				]
			}) : mkNews("gov", `ВЛАСТЬ СОХРАНЯЕТ МАНДАТ: ${fmt1(voteShare)}% ГОЛОСОВ`, `Избиратель одобрил курс при росте ${fmt1(gdpGrowth)}%, инфляции ${fmt1(inflation)}% и безработице ${fmt1(unemployment)}%.${promisesTotal ? ` Сдержано обещаний: ${promisesKept} из ${promisesTotal}.` : ""}${geoLine} Преемственность экономической политики — это не только про идеи, это про то, что ожидания не приходится заново заякоривать.`, { priority: 9 }));
		} else {
			mandate = unemployment - nairu > 1.2 ? "jobs" : inflation > infTarget + 2 ? "prices" : debtToGdp > 85 ? "budget" : "growth";
			governmentLine = mandate === "jobs" ? "populist" : mandate === "budget" ? "austerity" : "technocrat";
			const shock = electionResult === "landslide" ? 1.7 : 1;
			nextQueue.push(makeImpulse("businessConfidence", -8 * shock, "Смена власти: бизнес ждёт новых правил", "default", difficulty, "other"));
			nextQueue.push(makeImpulse("investment", -2.2 * shock, "Смена власти и неопределённость политики", "default", difficulty));
			nextQueue.push(makeImpulse("riskPremium", .45 * shock, "Смена власти: инвесторы пересматривают риск", "default", difficulty));
			nextQueue.push(makeImpulse("capitalFlow", -14 * shock, "Отток капитала после смены власти", "default", difficulty));
			news.push(mkNews("gov", electionResult === "landslide" ? "СОКРУШИТЕЛЬНОЕ ПОРАЖЕНИЕ ВЛАСТИ НА ВЫБОРАХ" : "ОППОЗИЦИЯ ПОБЕЖДАЕТ НА ВЫБОРАХ", `За власть ${fmt1(voteShare)}% голосов при рейтинге ${Math.round(approval)} из 100.${promisesTotal ? ` Сдержано обещаний: ${promisesKept} из ${promisesTotal} — избиратель это посчитал.` : ""}${geoLine} Новое правительство приходит с мандатом: ${{
				jobs: "занятость любой ценой",
				prices: "обуздать цены",
				budget: "привести бюджет в порядок",
				growth: "вернуть рост"
			}[mandate]}. Экономический курс будет переписан, а пока он переписывается, инвестиции и капитал ждут в стороне.`, {
				priority: 10,
				chain: [
					"Низкий рейтинг",
					"Смена власти",
					"Неопределённость ↑",
					"Инвестиции ↓",
					"Премия за риск ↑",
					"Новый курс"
				]
			}));
		}
	}
	const inflationRisk = clamp(ema(s.inflationRisk, clamp(Math.abs(inflation - infTarget) * 9 + Math.max(0, inflationExpectations - infTarget) * 6, 0, 100), .3), 0, 100);
	const debtRisk = clamp(ema(s.debtRisk, clamp(Math.max(0, debtToGdp - 45) * .8 + Math.max(0, -budgetBalancePctGdp - 2) * 5 + Math.max(0, effectiveDebtRate - gdpGrowth - inflation) * 3, 0, 100), .3), 0, 100);
	const recessionRisk = clamp(ema(s.recessionRisk, clamp(Math.max(0, -outputGap) * 11 + Math.max(0, unemployment - nairu) * 6 + Math.max(0, rateGap) * 4, 0, 100), .3), 0, 100);
	const currencyRisk = clamp(ema(s.currencyRisk || 20, clamp(Math.max(0, -currentAccount / Math.max(1, nominalGdp) * 100) * 9 + Math.max(0, 200 - reserves) * .12 + Math.max(0, riskPremium - 2) * 8, 0, 100), .3), 0, 100);
	const recessionStreak = outputGap < CONFIG.thresholds.recessionGap ? (s.recessionStreak || 0) + 1 : 0;
	const wasRecession = (s.activeCrises || []).includes("recession");
	const recessionRecoverStreak = outputGap >= CONFIG.thresholds.recessionGapExit ? (s.recessionRecoverStreak || 0) + 1 : 0;
	const recessionNow = wasRecession ? recessionRecoverStreak < CONFIG.thresholds.recessionGapQuarters : recessionStreak >= CONFIG.thresholds.recessionGapQuarters;
	const regimeStreakPrev = s.regimeStreak || 0;
	const fxMovePct = Math.abs(fxDeprAnnual);
	const pandemicQuartersLeft = pandemicTriggered ? 3 : Math.max(0, (s.pandemicQuartersLeft || 0) - 1);
	const warDecreed = !!pres.patch.startWar;
	const warTarget = warDecreed ? sanitizeWarTarget(decisions.warTarget, s) : (s.warQuartersLeft || 0) > 0 && s.warType === "offensive" ? warTargetOf(s) : null;
	const warEnded = !!pres.patch.endWar;
	const revancheStart = RV.start;
	const offensiveOngoing = (s.warQuartersLeft || 0) > 0 && (s.warType === "offensive" || s.warType === "revanche" || s.warType === "defensive");
	let warQuartersLeft = warDecreed ? 10 : revancheStart ? 10 : warTriggered ? 4 : offensiveOngoing ? s.warQuartersLeft : Math.max(0, (s.warQuartersLeft || 0) - 1);
	if (pres.patch.warExtend && warQuartersLeft > 0) warQuartersLeft += pres.patch.warExtend;
	if (warEnded || WC.endWar || RV.endWar || DF.endWar) warQuartersLeft = 0;
	let annexed = [...s.annexed || []];
	const annexLoyaltyNext = { ...AN.loyalty };
	const groupMemoryLate = [];
	if (s.warType === "offensive" && warTargetOf(s) === "north" && (s.warQuartersLeft || 0) > 0 && warQuartersLeft === 0) {
		const fresh = ((WC.campaign || s.warCampaign || {}).captured || []).filter((id) => !annexed.includes(id) && ANNEX_EFFECT[id]);
		if (fresh.length) {
			annexed = [...annexed, ...fresh];
			groupMemoryLate.push(...groupMemoryOf({
				siloviki: 6,
				pensioners: 3,
				business: -3
			}, "Присоединение новых земель", 10));
			fresh.forEach((id) => {
				nextQueue.push(...ANNEX_EFFECT[id].impulses(difficulty));
				annexLoyaltyNext[ANNEX_REGION_OF[id]] = regionById(ANNEX_REGION_OF[id]).loyalty0;
			});
			nextQueue.push(sustainedImpulse("tensionPush", .8 * fresh.length, 4, "Сопротивление на присоединённых землях"));
			news.push(mkNews("gov", "ГРАНИЦА СДВИНУТА: НОВЫЕ ЗЕМЛИ В СОСТАВЕ СТРАНЫ", `В состав страны входят: ${fresh.map((id) => ANNEX_EFFECT[id].name).join(", ")}. Новые жители, новые рудники и дороги — и первое время неспокойные улицы.`, {
				priority: 9,
				chain: [
					"Война окончена",
					"Присоединение",
					"Рабочая сила ↑",
					"Напряжённость ↑"
				]
			}));
		}
	}
	if (s.warCampaign && warQuartersLeft === 0 && !WC.endWar && !warEnded && !warDecreed) {
		const kept = (WC.campaign || s.warCampaign).captured || [];
		news.push(mkNews("gov", `ФРОНТ ЗАМЕР: ВОЙНА ${WAR_TARGETS[warTargetOf(s)].ins.toUpperCase()} ЗАКОНЧИЛАСЬ ПЕРЕМИРИЕМ`, kept.length ? `Боевые действия прекращены по линии фронта. За страной остаётся: ${kept.map((id) => WAR_OBJECTIVE_BY_ID[id].name).join(", ")}.` : "Боевые действия прекращены по линии фронта, ни одна из целей операции не взята.", { priority: 9 }));
	}
	const warType = warDecreed ? "offensive" : revancheStart ? "revanche" : warTriggered ? warTypeRolled : warQuartersLeft > 0 ? s.warType || null : null;
	const warByChoice = warDecreed ? true : warQuartersLeft > 0 ? !!s.warByChoice : false;
	const warElapsed = warDecreed || warTriggered || revancheStart ? 1 : warQuartersLeft > 0 ? (s.warElapsed || 0) + 1 : 0;
	let peaceTalks = PC.talks;
	let treaty = PC.treaty;
	if (RV.talks) peaceTalks = RV.talks;
	if (s.warType === "offensive" && warTargetOf(s) === "north" && (s.warQuartersLeft || 0) > 0 && warQuartersLeft === 0 && annexed.length) {
		const held = ((WC.campaign || s.warCampaign || {}).captured || []).concat(annexed);
		const value = [...new Set(held)].reduce((a, id) => a + (OBJECTIVE_VALUE[id] || 0), 0);
		peaceTalks = {
			since: quarterIndex,
			leverage: Math.max(0, 15 + value + (WC.victory ? 50 : 0) - (warEnded ? 10 : 0)),
			attempts: 0,
			origin: "offensive"
		};
		news.push(mkNews("gov", "ОТКРЫТЫ ПЕРЕГОВОРЫ С НОРЛАНДОМ", "Стрельба прекращена, но чья это земля — решит договор: признание границы, санкции, репарации. Позиция страны тем сильнее, чем больше взято, и тает, пока тянут время.", { priority: 8 }));
	}
	if (warDecreed || revancheStart) {
		peaceTalks = null;
		treaty = null;
	}
	const dropped = [...RV.lost, ...PC.returned];
	const territory = dropAnnexed({
		annexed,
		annexLoyalty: annexLoyaltyNext,
		annexIntegrated: AN.integrated,
		annexFunded: AN.funded,
		projects: RS.projects,
		projectsBuilt: RS.projectsBuilt,
		regionEvent: RS.regionEvent
	}, dropped);
	if (dropped.length) dropped.forEach((id) => {
		const obj = regionById(id).objective;
		nextQueue.push(makeImpulse("laborForce", obj === "city" ? -.8 : obj === "mines" ? -.3 : -.2, `Утрачен ${regionById(id).name}`, "slow", difficulty, "other"));
		if (obj === "mines") nextQueue.push(sustainedImpulse("exportsGrowth", -.8, 6, "Руда Хальвика больше не наша"));
	});
	if (!territory.annexed.length) peaceTalks = null;
	const sanctionsQuartersLeft = pres.patch.sanctionsStart || DP.sanctionsWest ? 10 : Math.max(0, (s.sanctionsQuartersLeft || 0) - 1);
	const FIRMS_Q = firmsStep(s.firms, {
		gdpGrowth,
		rateGap,
		profitTaxRate: decisions.profitTaxRate,
		fxDeprAnnual,
		exportsGrowth,
		sanctions: sanctionsQuartersLeft > 0,
		atWar: (s.warQuartersLeft || 0) > 0
	});
	if (FIRMS_Q.investmentPush) nextQueue.push(makeImpulse("investment", FIRMS_Q.investmentPush, FIRMS_Q.investmentPush > 0 ? "Крупные компании расширяются" : "Крупные компании откладывают инвестиции", "default", difficulty));
	FIRMS_Q.events.forEach(({ firm, kind }) => {
		const where = firm.regions.map((r) => (regionById(r) || {}).short || r).join(", ");
		if (kind === "cutting") news.push(mkNews("business", `${firm.name.toUpperCase()}: СОКРАЩЕНИЯ`, `${firm.name} (${firm.sector.toLowerCase()}) сокращает людей: дорогой кредит, налоги или слабый спрос. Неспокойно в областях: ${where}.`, { priority: 6 }));
		else if (kind === "expanding") news.push(mkNews("business", `${firm.name.toUpperCase()} РАСШИРЯЕТСЯ`, `${firm.sector}: новые мощности и рабочие места (${where}). Бизнес голосует деньгами за нынешнюю политику.`, { priority: 5 }));
		else if (kind === "gone") news.push(mkNews("business", `${firm.name.toUpperCase()} УХОДИТ ИЗ СТРАНЫ`, "Санкции Вестравии: иностранная сеть закрывает магазины, покупатели и работники ищут, куда идти.", { priority: 6 }));
		else if (kind === "back") news.push(mkNews("business", `${firm.name.toUpperCase()} ВОЗВРАЩАЕТСЯ`, "Санкции сняты — сеть снова открывает магазины.", { priority: 5 }));
	});
	const tradeBlocQuartersLeft = pres.patch.tradeBlocJoin ? 6 : Math.max(0, (s.tradeBlocQuartersLeft || 0) - 1);
	const tradeBlocActive = !!pres.patch.tradeBlocJoin || !!s.tradeBlocActive;
	const activeCrises = [];
	if (bankingRisk >= CONFIG.thresholds.bankingRisk || bankCapitalAdequacy < 8) activeCrises.push("banking");
	if (debtRisk >= CONFIG.thresholds.debtRisk) activeCrises.push("debt");
	if (fxMovePct >= CONFIG.thresholds.currencyMovePct || fxBreak) activeCrises.push("currency");
	if (inflation >= Math.max(CONFIG.thresholds.stagflationInflation, infTarget + 2.5) && outputGap <= CONFIG.thresholds.stagflationGap) activeCrises.push("stagflation");
	else if (recessionNow) activeCrises.push("recession");
	if (outputGap >= CONFIG.thresholds.overheatGap && inflation > infTarget + 1) activeCrises.push("overheating");
	if (inflation < CONFIG.thresholds.deflation && outputGap < -1) activeCrises.push("deflation");
	if (pandemicQuartersLeft > 0) activeCrises.push("pandemic");
	if (warQuartersLeft > 0) activeCrises.push("war");
	const regime = activeCrises.includes("currency") ? "currency" : activeCrises.includes("banking") ? "banking" : activeCrises.includes("debt") ? "debt" : activeCrises.includes("war") ? "war" : activeCrises.includes("pandemic") ? "pandemic" : activeCrises.includes("stagflation") ? "stagflation" : activeCrises.includes("deflation") ? "deflation" : activeCrises.includes("overheating") ? "overheating" : activeCrises.includes("recession") ? "recession" : "normal";
	if (inflation < 0 && s.inflation >= 0) news.push(mkNews("crisis", `ИНФЛЯЦИЯ УШЛА В МИНУС: ${rfs(inflation)}%`, "Цены в среднем снижаются — это уже дефляция, а не просто медленный рост. Отложенный спрос («подождём — подешевеет») бьёт по продажам сильнее, чем кажется, а реальная тяжесть долгов растёт даже без роста номинального долга.", { priority: 8 }));
	const prevCrises = s.activeCrises || [];
	activeCrises.filter((c) => !prevCrises.includes(c)).forEach((c) => {
		if (c === "banking") {
			nextQueue.push(makeImpulse("investment", -4.5, "Банковский кризис: кредит недоступен", "default", difficulty));
			nextQueue.push(makeImpulse("consumption", -1.8, "Банковский кризис: сжатие потребительского кредита", "default", difficulty));
			nextQueue.push(makeImpulse("bankLiquidity", -10, "Банковский кризис", "fast", difficulty));
			nextQueue.push(makeImpulse("capitalFlow", -20, "Бегство из банковской системы", "default", difficulty));
			news.push(mkNews("crisis", "БАНКОВСКИЙ КРИЗИС: КРЕДИТОВАНИЕ ОСТАНОВЛЕНО", "Капитал банков не покрывает потери. Экстренная поддержка спасёт систему, но ударит по доверию к ЦБ и разгонит денежную массу.", {
				priority: 10,
				chain: [
					"Потери банков",
					"Капитал ↓",
					"Кредит ↓",
					"Инвестиции ↓",
					"ВВП ↓",
					"Просрочка ↑"
				]
			}));
		} else if (c === "debt") {
			nextQueue.push(makeImpulse("riskPremium", 1.8, "Долговой кризис: инвесторы требуют премию", "fast", difficulty));
			nextQueue.push(makeImpulse("capitalFlow", -30, "Долговой кризис: отток капитала", "default", difficulty));
			nextQueue.push(makeImpulse("govTrust", -8, "Долговой кризис", "fast", difficulty));
			news.push(mkNews("crisis", "ДОЛГОВОЙ КРИЗИС: ИНВЕСТОРЫ ТРЕБУЮТ ПРЕМИЮ", "Каждый новый выпуск долга дороже предыдущего. Спираль «дефицит → ставка → процентные расходы → дефицит» запущена.", {
				priority: 10,
				chain: [
					"Долг ↑",
					"Премия за риск ↑",
					"Ставка по долгу ↑",
					"Расходы на проценты ↑",
					"Дефицит ↑"
				]
			}));
		} else if (c === "currency") {
			nextQueue.push(makeImpulse("inflationSupply", 1.6, "Валютный кризис: удорожание импорта", "fast", difficulty));
			nextQueue.push(makeImpulse("consumerConfidence", -8, "Валютный кризис", "fast", difficulty));
			news.push(mkNews("crisis", "ВАЛЮТНЫЙ КРИЗИС: РЕЗКОЕ ДВИЖЕНИЕ КУРСА", "Курс переносится в цены. Защищать его резервами — тратить их, отпустить — принять импортную инфляцию.", {
				priority: 10,
				chain: [
					"Отток капитала",
					"Курс ↓",
					"Импортные цены ↑",
					"Инфляция ↑",
					"Реальные доходы ↓"
				]
			}));
		} else if (c === "stagflation") news.push(mkNews("crisis", "СТАГФЛЯЦИЯ: СПАД И ИНФЛЯЦИЯ ОДНОВРЕМЕННО", "Ставку вверх — углубить спад; ставку вниз — сорвать ожидания. У этой ситуации нет решения без потерь.", {
			priority: 10,
			chain: [
				"Шок издержек",
				"Выпуск ↓",
				"Инфляция ↑",
				"Дилемма ЦБ"
			]
		}));
		else if (c === "overheating") news.push(mkNews("crisis", "ЭКОНОМИКА ПЕРЕГРЕТА", "Выпуск устойчиво выше потенциала: дальнейший спрос уходит в цены, а не в производство.", { priority: 9 }));
		else if (c === "recession") news.push(mkNews("crisis", "РЕЦЕССИЯ: ВЫПУСК НИЖЕ ПОТЕНЦИАЛА", "Второй квартал подряд. Затяжная безработица поднимает и сам естественный уровень — часть потерь станет необратимой.", { priority: 9 }));
		else if (c === "deflation") news.push(mkNews("crisis", "ДЕФЛЯЦИОННАЯ УГРОЗА", "Цены почти не растут при слабом спросе: реальная ставка высока даже при нулевой ключевой. Обычных инструментов может не хватить.", { priority: 9 }));
		else if (c === "war" && warByChoice) {
			const statePress = s.politicalRegime === "authoritarian" || s.politicalRegime === "totalitarian";
			news.push(mkNews("gov", statePress ? "ВВЕДЕНО ВОЕННОЕ ПОЛОЖЕНИЕ: СТРАНА СПЛОТИЛАСЬ" : "СТРАНА ПЕРЕХОДИТ НА ВОЕННОЕ ПОЛОЖЕНИЕ", statePress ? s.politicalRegime === "totalitarian" ? "Обращение к народу: враг у ворот, и народ как один встаёт на защиту Родины. Экономика переводится на нужды фронта, предприятия получают оборонный заказ. Попытки сеять панику и распространять слухи о трудностях пресекаются по законам военного времени." : "Официальное сообщение: в ответ на угрозу безопасности вводится военное положение. Промышленность получает оборонный заказ, правительство берёт экономику под особый контроль. Трудности временные — страна справится." : "Торговля, инвестиции и доверие сжимаются одновременно — это не стихия, а прямое следствие принятого решения. Расходы на оборону, сделанные до войны, определяют, насколько тяжёлым будет первый год. Чрезвычайные полномочия с этого момента доступны власти в полном объёме.", {
				priority: 10,
				chain: statePress ? [
					"Угроза",
					"Военное положение",
					"Оборонный заказ"
				] : [
					"Решение о войне",
					"Санкции",
					"Торговля ↓",
					"Военное положение"
				]
			}));
		}
	});
	prevCrises.filter((c) => !activeCrises.includes(c)).forEach((c) => {
		if (c === "war" && s.warByChoice) {
			const authoritarianPress = s.politicalRegime === "authoritarian" || s.politicalRegime === "totalitarian";
			news.push(mkNews("gov", "ВОЕННАЯ ОПЕРАЦИЯ ЗАВЕРШЕНА", authoritarianPress ? "Официальное сообщение: поставленные задачи выполнены полностью, операция завершена победой. Чрезвычайные полномочия, введённые на время войны, снимаются — страна возвращается к мирной жизни с позиции силы." : "Официально — «цели достигнуты». Санкции снимаются медленнее, чем вводились, капитал возвращается неохотно, а потенциал, из которого забрали людей и мощности, восстанавливается годами. Чрезвычайные полномочия перестают быть доступны.", {
				priority: 9,
				chain: [
					"Война окончена",
					"Премия за риск ↓",
					"Санкции остаются",
					"Потенциал восстанавливается годами"
				]
			}));
		} else if (c === "war") {
			const endNote = s.warType === "offensive" ? " Санкции обычно снимаются медленнее, чем вводились — торговые ограничения ещё долго будут сдерживать восстановление." : s.warType === "defensive" ? " Иностранная помощь сворачивается вместе с чрезвычайным положением — экономике предстоит учиться стоять без неё." : "";
			news.push(mkNews("crisis", "ВОЙНА ОКОНЧЕНА", `Боевые действия прекратились. Торговля, инвестиции и доверие начинают восстанавливаться — но быстро зарубцевавшихся последствий войны не бывает.${endNote}`, { priority: 8 }));
		} else if (c === "pandemic") news.push(mkNews("crisis", "ПАНДЕМИЯ ОТСТУПИЛА", "Ограничения сняты, спрос и производственные возможности возвращаются к норме.", { priority: 7 }));
	});
	const prevPoliticalRegime = s.politicalRegime || "democracy";
	const repression = prevPoliticalRegime === "totalitarian" ? 1 : prevPoliticalRegime === "authoritarian" ? .55 : prevPoliticalRegime === "crisis" ? .15 : 0;
	const tensionTarget = clamp(Math.max(0, 55 - approval) * 1.3 + (warQuartersLeft > 0 ? 12 : 0) + activeCrises.length * 6 + Math.max(0, unemployment - 7.5) * 2.2 + saturating(Math.max(0, inflation - 8), 1.6, 12.5) + Math.max(0, debtToGdp - 90) * .15 + repression * 14 + GS.unrest - 22 * mandateEffect - Math.max(0, approval - 55) * .6, 0, 100);
	let politicalTension = clamp(ema(Number.isFinite(s.politicalTension) ? s.politicalTension : 8, tensionTarget, .3) + (d.tensionPush || 0) - .8 * stabilizationBonus, 0, 100);
	let powerLost = null;
	let politicalRegime = coup ? "authoritarian" : prevPoliticalRegime;
	let parliamentDissolved = coup ? true : !!s.parliamentDissolved;
	let decreeRule = coup ? true : !!s.decreeRule;
	if (pres.patch.dissolve && !kids) {
		parliamentDissolved = true;
		decreeRule = true;
		if (politicalRegime === "democracy" || politicalRegime === "crisis") politicalRegime = "authoritarian";
		cooldowns["political:transition"] = 4;
	}
	if (pres.patch.restore) {
		parliamentDissolved = false;
		decreeRule = false;
		if (politicalRegime === "authoritarian" || politicalRegime === "totalitarian") politicalRegime = "crisis";
		cooldowns["political:transition"] = 3;
	}
	if (pres.patch.totalize && politicalRegime === "authoritarian" && !kids) {
		politicalRegime = "totalitarian";
		parliamentDissolved = true;
		decreeRule = true;
		cooldowns["political:transition"] = 6;
	}
	const politicalCooldown = coup ? 4 : cooldowns["political:transition"] || 0;
	if (politicalCooldown <= 0) {
		if (politicalRegime === "democracy" && politicalTension >= 62) {
			politicalRegime = "crisis";
			cooldowns["political:transition"] = 3;
			news.push(mkNews("gov", "ПАРЛАМЕНТ И ПРЕЗИДЕНТ: ОТКРЫТЫЙ КОНФЛИКТ", `Взаимные вето и угроза импичмента парализуют принятие решений. Рейтинг власти ${Math.round(approval)} из 100 — почвы для компромисса всё меньше.`, {
				priority: 9,
				chain: [
					"Низкий рейтинг",
					"Паралич власти",
					"Конфликт ветвей власти"
				]
			}));
		} else if (politicalRegime === "crisis") {
			if (!kids && politicalTension >= 70 && rng() < .4) {
				politicalRegime = "authoritarian";
				parliamentDissolved = true;
				cooldowns["political:transition"] = 4;
				nextQueue.push(makeImpulse("businessConfidence", -10, "Роспуск парламента: институты слабеют", "default", difficulty, "other"));
				nextQueue.push(makeImpulse("riskPremium", .6, "Политический режим меняется", "default", difficulty));
				news.push(mkNews("gov", "ПАРЛАМЕНТ РАСПУЩЕН: ВЛАСТЬ СОСРЕДОТОЧЕНА В ОДНИХ РУКАХ", "Указ объявлен временной мерой «ради стабильности». Оппозиция называет это концом парламентской республики.", {
					priority: 10,
					chain: [
						"Конфликт ветвей власти",
						"Роспуск парламента",
						"Авторитарный поворот"
					]
				}));
			} else if (politicalTension <= 30) {
				politicalRegime = "democracy";
				cooldowns["political:transition"] = 2;
				news.push(mkNews("gov", "ПОЛИТИЧЕСКИЙ КРИЗИС ИСЧЕРПАН", "Стороны нашли компромисс, парламент возвращается к обычной работе.", { priority: 7 }));
			}
		} else if (politicalRegime === "authoritarian") {
			if (!kids && politicalTension >= 80 && rng() < .38) {
				politicalRegime = "totalitarian";
				cooldowns["political:transition"] = 6;
				nextQueue.push(makeImpulse("businessConfidence", -14, "Установление тоталитарного контроля", "default", difficulty, "other"));
				nextQueue.push(makeImpulse("investment", -3, "Инвесторы уходят из страны", "default", difficulty));
				nextQueue.push(makeImpulse("capitalFlow", -18, "Бегство капитала", "default", difficulty));
				news.push(mkNews("gov", "ВЛАСТЬ УСТАНАВЛИВАЕТ ПОЛНЫЙ КОНТРОЛЬ", "Оставшиеся независимые институты и медиа переходят под прямое управление. Несогласие приравнено к угрозе государству, выборы отменены без назначения новой даты.", {
					priority: 10,
					chain: [
						"Авторитарный поворот",
						"Подавление институтов",
						"Тоталитарный режим"
					]
				}));
			} else if (politicalTension <= 25 && !decreeRule && rng() < .25) {
				politicalRegime = "democracy";
				parliamentDissolved = false;
				cooldowns["political:transition"] = 3;
				news.push(mkNews("gov", "ЧРЕЗВЫЧАЙНОЕ ПОЛОЖЕНИЕ СНЯТО, ПАРЛАМЕНТ ВОССТАНОВЛЕН", "Обстоятельства, которыми объясняли особый режим, отпали, и удерживать его дальше стало дороже, чем вернуть обычную процедуру. Объявлены свободные выборы.", { priority: 8 }));
			}
		} else if (politicalRegime === "totalitarian") {
			if (politicalTension >= 92 && rng() < .12) {
				politicalRegime = "crisis";
				parliamentDissolved = false;
				cooldowns["political:transition"] = 5;
				powerLost = "uprising";
				nextQueue.push(makeImpulse("businessConfidence", 6, "Режим пал: осторожный оптимизм", "default", difficulty, "other"));
				news.push(mkNews("gov", "РЕЖИМ ПАЛ", "Массовые протесты и раскол в элитах вынудили власть отступить. Страна входит в переходный период с неясным исходом.", {
					priority: 10,
					chain: [
						"Массовые протесты",
						"Раскол элит",
						"Падение режима",
						"Переходный период"
					]
				}));
			}
		}
	} else cooldowns["political:transition"] = politicalCooldown - 1;
	const unrestCooldown = cooldowns["political:unrest"] || 0;
	let unrestTriggered = false;
	if (unrestCooldown <= 0 && politicalTension >= 55) {
		const chance = .05 + politicalTension / 400 + (warQuartersLeft > 0 ? .08 : 0) + repression * .06;
		if (rng() < chance) {
			unrestTriggered = true;
			cooldowns["political:unrest"] = 2;
			nextQueue.push(makeImpulse("consumption", -1.2, "Беспорядки: перебои в повседневной жизни", "default", difficulty));
			nextQueue.push(makeImpulse("businessConfidence", -6, "Беспорядки в стране", "default", difficulty, "other"));
			nextQueue.push(makeImpulse("investment", -1.4, "Беспорядки отпугивают инвестиции", "default", difficulty));
			news.push(repression > .4 ? mkNews("crisis", "БЕСПОРЯДКИ ПОДАВЛЕНЫ СИЛОЙ", "Силовые структуры разогнали демонстрантов. Официально — «попытка дестабилизации», пресечённая в интересах порядка.", { priority: 9 }) : mkNews("crisis", "МАССОВЫЕ ПРОТЕСТЫ В СТОЛИЦЕ", "Люди вышли на улицы требовать перемен. Власть пытается балансировать между уступками и силовым сценарием.", { priority: 9 }));
		}
	} else if (unrestCooldown > 0) cooldowns["political:unrest"] = unrestCooldown - 1;
	const unrestQuartersLeft = unrestTriggered ? 2 : Math.max(0, (s.unrestQuartersLeft || 0) - 1);
	const unrestActive = unrestQuartersLeft > 0;
	const coupCooldown = cooldowns["political:military"] || 0;
	const regimeJustChanged = coup || (cooldowns["political:transition"] || 0) > 0;
	if (!powerLost && !regimeJustChanged && (politicalRegime === "authoritarian" || politicalRegime === "totalitarian")) {
		if (coupCooldown > 0) cooldowns["political:military"] = coupCooldown - 1;
		else {
			const chance = militaryCoupRisk({
				politicalTension,
				unemployment,
				nairu,
				inflation,
				activeCrises,
				approval,
				unrestActive,
				politicalCapital: Number.isFinite(s.politicalCapital) ? s.politicalCapital : 55,
				groupSupport: GS.support
			});
			if (chance > 0 && rng() < chance) {
				const legitimacy = clamp((approval - 35) / 40, 0, 1) * .6 + clamp((45 - politicalTension) / 45, 0, 1) * .4;
				cooldowns["political:military"] = 8;
				if (rng() < legitimacy) {
					nextQueue.push(makeImpulse("approvalPush", 6, "Попытка переворота провалилась: власть защитили", "fast", difficulty, "other"));
					nextQueue.push(makeImpulse("tensionPush", 9, "Раскол в силовых структурах", "fast", difficulty, "other"));
					nextQueue.push(makeImpulse("businessConfidence", -7, "Попытка переворота: страна на грани", "default", difficulty, "other"));
					nextQueue.push(makeImpulse("riskPremium", .35, "Попытка переворота", "default", difficulty));
					news.push(mkNews("gov", "ПОПЫТКА ГОСУДАРСТВЕННОГО ПЕРЕВОРОТА ПРЕСЕЧЕНА", `Ночью часть войск попыталась занять правительственные здания. При рейтинге власти ${Math.round(approval)} из 100 и напряжённости ${Math.round(politicalTension)} улица вышла за действующую власть, а не против неё: к утру мятеж подавлен, зачинщики арестованы. Официально — «происки внешних сил, не нашедшие поддержки в народе»; то, что часть армии вообще была готова выступить, в сводки не попадёт.`, {
						priority: 10,
						chain: [
							"Выступление части армии",
							"Улица за власть",
							"Мятеж подавлен",
							"Рейтинг ↑",
							"Раскол в элитах"
						]
					}));
				} else {
					powerLost = "military";
					politicalRegime = "crisis";
					parliamentDissolved = false;
					decreeRule = false;
					nextQueue.push(makeImpulse("businessConfidence", -12, "Военный переворот: правил больше нет", "default", difficulty, "other"));
					nextQueue.push(makeImpulse("riskPremium", .9, "Военный переворот", "default", difficulty));
					nextQueue.push(makeImpulse("capitalFlow", -22, "Бегство капитала после переворота", "default", difficulty));
					news.push(mkNews("crisis", "ВОЕННЫЙ ПЕРЕВОРОТ: АРМИЯ БЕРЁТ ВЛАСТЬ", `Ночью войска заняли правительственные здания. Официальное объяснение — «восстановление порядка» при напряжённости ${Math.round(politicalTension)} из 100 и рейтинге власти ${Math.round(approval)}: защищать эту власть на улицу никто не вышел. ${noElections ? "Тот, кто отменил выборы" : "Тот, кто превратил выборы в формальность"}, снимается с должности не голосованием.`, {
						priority: 10,
						chain: [
							"Напряжение в стране",
							"Раскол в элитах",
							"Выступление армии",
							"Смена власти",
							"Бегство капитала"
						]
					}));
				}
			}
		}
	} else if (coupCooldown > 0) cooldowns["political:military"] = coupCooldown - 1;
	const presidentSatisfaction = decisions.presidentActive ? presidentSatisfactionNext(Number.isFinite(s.presidentSatisfaction) ? s.presidentSatisfaction : 60, {
		directiveMet: decisions.presidentDirectiveMet,
		patience: decisions.presidentPatience || 1,
		approval,
		gdpGrowth,
		potentialGrowth,
		activeCrises
	}) : Number.isFinite(s.presidentSatisfaction) ? s.presidentSatisfaction : 60;
	const capitalAfterSpend = clamp(startCapital - presSpent, 0, 100);
	const politicalCapitalGain = politicalCapitalRegen({
		approval,
		gdpGrowth,
		potentialGrowth,
		activeCrises,
		unrestActive,
		politicalRegime,
		politicalCapital: capitalAfterSpend
	});
	const politicalCapital = clamp(capitalAfterSpend + politicalCapitalGain, 0, 100);
	const demandCandidates = [];
	if (decisions.incomeTaxRate > TAX_DEMAND_CAP.incomeTaxRate || decisions.vatRate > TAX_DEMAND_CAP.vatRate) {
		const over = [decisions.incomeTaxRate > TAX_DEMAND_CAP.incomeTaxRate && `подоходный ${rf1(decisions.incomeTaxRate)}% (терпимо до ${TAX_DEMAND_CAP.incomeTaxRate}%)`, decisions.vatRate > TAX_DEMAND_CAP.vatRate && `НДС ${rf1(decisions.vatRate)}% (терпимо до ${TAX_DEMAND_CAP.vatRate}%)`].filter(Boolean).join(", ");
		demandCandidates.push({
			id: "tax_cut",
			actor: "Население",
			text: `Налоговая нагрузка невыносима — требуют снижения налогов: ${over}.`
		});
	}
	if (lendingRate - inflation > 6 && businessConfidence < 50) demandCandidates.push({
		id: "rate_cut",
		actor: "Бизнес",
		text: "Реальная стоимость кредита душит инвестиции — требуют снизить ставку."
	});
	if (debtToGdp > 85) demandCandidates.push({
		id: "debt_cut",
		actor: "Инвесторы",
		text: "Долговая нагрузка выше комфортного уровня — требуют бюджетной консолидации."
	});
	if (unemployment > 7.5) demandCandidates.push({
		id: "social_up",
		actor: "Парламент",
		text: "Безработица высока — требуют расширить социальные выплаты."
	});
	if (inflation > 8) demandCandidates.push({
		id: "infl_down",
		actor: "Профсоюзы",
		text: "Инфляция съедает зарплаты — требуют вернуть цены под контроль."
	});
	if (shadowShare > 22) demandCandidates.push({
		id: "shadow",
		actor: "Налоговая служба",
		text: "Бизнес массово уходит в тень — база размывается быстрее, чем растут ставки."
	});
	const prevDemands = s.demands || [];
	const demands = demandCandidates.map((c) => {
		const prev = prevDemands.find((p) => p.id === c.id);
		return {
			...c,
			quartersActive: prev ? prev.quartersActive + 1 : 1
		};
	});
	const { scoreStability, scoreWelfare, scoreFinancial, scoreFiscal, scorePotential, wellbeing } = computeScores({
		inflation,
		inflationExpectations,
		outputGap,
		cbCredibility,
		gdpGrowth,
		unemployment,
		nairu,
		consumerConfidence,
		humanCapitalIndex,
		bankingRisk,
		creditGap,
		bankCapitalAdequacy,
		capitalRequirement: decisions.capitalRequirement,
		currencyRisk,
		reserves,
		imports,
		debtToGdp,
		budgetBalancePctGdp,
		interestPayment,
		govRevenue,
		shadowShare,
		potentialGrowth,
		infrastructureIndex,
		productivity,
		inflationTarget: infTarget
	});
	const interestToRevenue = interestPayment / Math.max(1, govRevenue) * 100;
	const policyConflict = clamp(Math.max(0, (s.cbStance || 0) * (s.mofStance || 0)), 0, 1);
	const policyCoordination = clamp(s.policyCoordination + 3 - 16 * policyConflict, 0, 100);
	const newEconomy = {
		...s.economyOnly ? { economyOnly: true } : {},
		...s.kidsMode ? { kidsMode: true } : {},
		...s.currencyUnion ? { currencyUnion: {
			...s.currencyUnion,
			q: (s.currencyUnion.q || 0) + 1
		} } : {},
		distribution: DIST,
		gini: DIST.gini,
		povertyRate: DIST.povertyRate,
		povertyAbs: DIST.povertyAbs,
		guidance: GUID.next,
		firms: FIRMS_Q.firms,
		firmStress: FIRMS_Q.regionShift,
		...s.firmBoost ? { firmBoost: s.firmBoost } : {},
		gdp,
		nominalGdp,
		priceLevel,
		gdpGrowth,
		potentialGdp,
		potentialGrowth,
		outputGap,
		gdpPerCapita: gdp * 1e3 / CONFIG.population,
		consumption,
		businessInvestment,
		govPurchasesReal,
		govInvestmentReal,
		transfersReal,
		consumptionGrowth,
		investmentGrowth,
		govPurchasesGrowth: actualGrowthG,
		transfersGrowth: actualGrowthTr,
		govInvestmentGrowth: actualGrowthIg,
		sequesterFactor,
		maxDeficitPct,
		exports,
		imports,
		tradeBalance: exports - imports,
		currentAccount,
		capitalAccount,
		netCapitalFlow,
		reserves,
		fdi,
		exchangeRate,
		realExchangeRate,
		fxDeprAnnual,
		fxRegime: fxBreak ? "free" : decisions.fxRegime,
		fxTarget: fxBreak ? roundTo(exchangeRate, 1) : fxTarget,
		importPriceInflation,
		inflationTarget: infTarget,
		defenseIntervention,
		capitalStock,
		laborForce,
		productivity,
		humanCapitalIndex,
		infrastructureIndex,
		supplyScar,
		tfpGrowth,
		unemployment,
		prevUnemployment: s.unemployment,
		employment,
		nairu,
		tightness,
		vacancyRate,
		wageGrowth,
		unitLaborCostGrowth,
		inflation,
		coreInflation,
		inflationExpectations,
		cbCredibility,
		importPriceInfl: importPriceInflation,
		keyRate: decisions.keyRate,
		reserveReq: decisions.reserveReq,
		capitalRequirement: decisions.capitalRequirement,
		lendingRate,
		depositRate,
		realLendingRate,
		realPolicyRate,
		rStar,
		rateGap,
		policyStance,
		riskPremium,
		moneySupply,
		carry,
		creditVolume,
		creditGrowth,
		creditGap,
		creditGapLag,
		creditTrendRatio,
		creditImpulse,
		creditCrunch,
		bankNPL,
		bankCapital,
		bankCapitalAdequacy,
		bankLiquidity,
		bankProfit,
		loanLosses,
		bankingRisk,
		financialStability,
		incomeTaxRate: decisions.incomeTaxRate,
		profitTaxRate: decisions.profitTaxRate,
		vatRate: decisions.vatRate,
		exciseRate: decisions.exciseRate,
		capitalTaxRate: decisions.capitalTaxRate,
		socialContribRate: decisions.socialContribRate,
		shadowShare,
		taxWedgeValue: wedgeNow,
		revenueParts,
		govRevenue,
		revenuePctGdp,
		govPurchasesNominal,
		transfersNominal,
		govInvestmentNominal,
		govSpendingTotal,
		interestPayment,
		interestToRevenue,
		budgetBalance,
		budgetBalancePctGdp,
		structuralBalancePctGdp,
		primaryBalance,
		fiscalImpulse,
		govDebt,
		debtToGdp,
		effectiveDebtRate,
		budgetShares,
		defenseCommit,
		taxCommit,
		sovereignFund,
		fundPctGdp,
		netDebtToGdp,
		fundIncome,
		marketLockoutQuartersLeft,
		defaultedEver,
		justDefaulted: sovereignDefault,
		imfQuartersLeft,
		imfActive,
		imfStarted,
		consumerConfidence,
		businessConfidence,
		govTrust,
		policyCoordination,
		approval,
		quartersToElection,
		term,
		mandate,
		governmentLine,
		electionResult,
		lastElection,
		campaignActive: campaign,
		electionVoteShare: voteShare,
		promisesKept: promisesTotal ? promisesKept : null,
		promisesTotal: promisesTotal || null,
		politicalRegime,
		politicalTension,
		parliamentDissolved,
		unrestQuartersLeft,
		unrestActive,
		powerLost,
		noElections,
		stabilizationCred,
		stabilizationWon,
		crisisMandateLeft,
		crisisMandateTotal: mandateTotal,
		projects: territory.projects,
		projectsBuilt: territory.projectsBuilt,
		regionMods: RS.regionMods,
		regionShock: RS.regionShock,
		regionEvent: territory.regionEvent,
		regionEventCooldown: RS.regionEventCooldown,
		lastRegionResolution: RS.lastRegionResolution,
		projectReal,
		campaignSpend: quartersToElection === CONFIG.election.cycle ? {} : CP.spend,
		warCampaign: warQuartersLeft > 0 && warType === "offensive" ? WC.campaign || newWarCampaign(annexed, warTarget || "north") : null,
		warTarget: warQuartersLeft > 0 && warType === "offensive" ? warTarget || "north" : null,
		annexed: territory.annexed,
		annexLoyalty: territory.annexLoyalty,
		annexIntegrated: territory.annexIntegrated,
		annexFunded: territory.annexFunded,
		revancheCampaign: warQuartersLeft > 0 && warType === "revanche" ? RV.campaign || s.revancheCampaign : null,
		defenseCampaign: warQuartersLeft > 0 && warType === "defensive" ? DF.campaign || s.defenseCampaign || newDefenseCampaign() : null,
		norlandRevanche: RV.start ? RV.revanche : clamp(RV.revanche + DP.revancheDelta, -50, 100),
		revancheWarned: RV.warned,
		peaceTalks,
		treaty,
		relations: DP.relations,
		diploTreaties: DP.treaties,
		diploSanctions: DP.sanctions,
		diploCooldown: DP.cooldown,
		deshtMobilized: warTriggered ? 0 : DP.mobilized,
		deshtCalm: DP.calm,
		neighborEvent: DP.event,
		diploLast: DP.last || null,
		diploResolved: DP.resolved || null,
		groupSupport: GS.support,
		groupSupportPrev: s.groupSupport || null,
		groupDriversNow: GS.drivers,
		groupUnrestCd: GE.cd,
		groupDemand: GD.demand,
		groupDemandCooldown: GD.cooldown,
		lastGroupResolution: GD.resolution || s.lastGroupResolution || null,
		groupMemory: [...GS.memory, ...groupMemoryLate],
		politicalCapital,
		politicalCapitalGain,
		reforms,
		cbTenure,
		mofTenure,
		decreeRule,
		presidentSatisfaction,
		worldGdpGrowth,
		worldInflation,
		worldRate,
		commodityIndex,
		worldDemandIndex,
		inflationRisk,
		debtRisk,
		recessionRisk,
		currencyRisk,
		bankingRiskValue: bankingRisk,
		yield3m,
		yield1y,
		yield2y,
		yield5y,
		yield10y,
		curveSlope,
		curveInverted,
		bondIndex,
		bondReturn,
		sovereignSpread,
		corporateSpread,
		stockIndex,
		stockReturn,
		stockPE,
		fairPE,
		equityRiskPremium,
		earnings,
		marketCap,
		marketCapPctGdp,
		sectorBanks,
		sectorIndustry,
		sectorConsumer,
		sectorResources,
		netInterestMargin,
		bankROE,
		bankPB,
		fxVolatility,
		volatilityIndex,
		discountRate,
		depositIndex,
		fxIndex,
		fxCarry,
		corpBondIndex,
		corpYield,
		corpReturn,
		goldIndex,
		reitIndex,
		bondShortIndex,
		linkerIndex,
		moneyMarketIndex,
		worldEquityIndex,
		activeCrises,
		regime,
		recessionStreak,
		recessionRecoverStreak,
		demands,
		pandemicQuartersLeft,
		warQuartersLeft,
		warType,
		warByChoice,
		warElapsed,
		sanctionsQuartersLeft,
		tradeBlocQuartersLeft,
		tradeBlocActive,
		regimeStreak: s.regime === regime ? regimeStreakPrev + 1 : 1,
		scoreStability,
		scoreWelfare,
		scoreFinancial,
		scoreFiscal,
		scorePotential,
		wellbeing,
		cbStance: s.cbStance || 0,
		mofStance: s.mofStance || 0,
		botHeadline: botAction ? botAction.headline : null,
		botDemand: botAction ? botAction.demand : null,
		botHeadline2: botActions && botActions[0] ? botActions[0].headline : null,
		botDemand2: botActions && botActions[0] ? botActions[0].demand : null
	};
	newEconomy.taylorRate = taylorRate(newEconomy);
	const byHeadline = (h) => log.filter((c) => c.headline === h).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 6);
	const outputGapReasons = log.filter((c) => c.headline === "gdpGrowth" || c.headline === "potential").sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 6);
	const reasons = {
		gdpGrowth: byHeadline("gdpGrowth"),
		inflation: byHeadline("inflation"),
		exchangeRate: byHeadline("exchangeRate"),
		budget: byHeadline("budget"),
		unemployment: byHeadline("unemployment"),
		banking: byHeadline("banking"),
		potential: byHeadline("potential"),
		outputGap: outputGapReasons
	};
	const report = buildReport({
		prev: s,
		next: newEconomy,
		reasons
	});
	const activeStories = [...stories || [], ...newStories];
	storyTriggers(s, newEconomy, decisions, activeStories, cooldowns).forEach((id) => {
		activeStories.push({
			tplId: id,
			nextIdx: 0,
			wait: storyStartWait(id)
		});
		cooldowns[`story:${id}`] = 10;
	});
	const advanced = advanceStories(activeStories, newEconomy, quarterIndex);
	const generated = generateNews(s, newEconomy, decisions, quarterIndex, botAction, cooldowns, botActions, publicMode);
	const propaganda = propagandaEditorial(newEconomy);
	const editorial = propaganda ? mkNews("editorial", propaganda.headline, propaganda.text, { priority: 2 }) : mkNews("editorial", `ИТОГИ ${quarterLabel(quarterIndex).toUpperCase()}`, report, { priority: 2 });
	return {
		economy: newEconomy,
		pendingImpulses: nextQueue,
		eventCooldowns: cooldowns,
		reasons,
		report,
		newsEntries: [
			...news,
			...advanced.news,
			...generated,
			editorial
		].map((n) => ({
			...n,
			q: quarterIndex,
			qLabel: quarterLabel(quarterIndex)
		})).sort((a, b) => b.priority - a.priority),
		stories: advanced.stories
	};
}
function makeInitialEconomy(scenarioId, extra = null) {
	const scenario = SCENARIOS.find((sc) => sc.id === scenarioId);
	const I = {
		...CONFIG.initial,
		...scenario && scenario.overrides,
		...extra
	};
	const own = {
		...scenario && scenario.overrides,
		...extra
	};
	if ("gdp" in own && !("consumption" in own) && !("businessInvestment" in own)) {
		const sum0 = CONFIG.initial.consumption + CONFIG.initial.businessInvestment;
		const gapAbs = I.gdp - CONFIG.initial.gdp;
		I.consumption = CONFIG.initial.consumption + gapAbs * CONFIG.initial.consumption / sum0;
		I.businessInvestment = CONFIG.initial.businessInvestment + gapAbs * CONFIG.initial.businessInvestment / sum0;
	}
	const potentialGdp = potentialFrom(I.capitalStock, I.laborForce, I.nairu, I.humanCapitalIndex, I.productivity, I.infrastructureIndex, TFP_SCALE, 0);
	const nominalGdp = I.gdp * I.priceLevel / 100;
	const dist0 = initialDistribution({
		vatRate: I.vatRate,
		incomeTaxRate: I.incomeTaxRate,
		capitalTaxRate: I.capitalTaxRate
	});
	const base = {
		...I,
		distribution: dist0,
		gini: dist0.gini,
		povertyRate: dist0.povertyRate,
		povertyAbs: dist0.povertyAbs,
		firms: initialFirms(),
		gdp: I.gdp,
		nominalGdp,
		potentialGdp,
		potentialGrowth: 2.3,
		outputGap: (I.gdp - potentialGdp) / potentialGdp * 100,
		gdpGrowth: 2.3,
		gdpPerCapita: I.gdp * 1e3 / CONFIG.population,
		consumptionGrowth: 2.3,
		investmentGrowth: 2.3,
		govPurchasesGrowth: 2.3,
		transfersGrowth: 2.3,
		govInvestmentGrowth: 2.3,
		tradeBalance: I.exports - I.imports,
		currentAccount: I.exports - I.imports - .012 * I.govDebt,
		capitalAccount: 0,
		netCapitalFlow: 0,
		fxDeprAnnual: 1,
		importPriceInflation: 4,
		importPriceInfl: 4,
		supplyScar: 0,
		tfpGrowth: CONFIG.prod.tfpBase,
		prevUnemployment: I.unemployment,
		employment: 100 - I.unemployment,
		tightness: 0,
		vacancyRate: 3,
		unitLaborCostGrowth: 4,
		realLendingRate: I.lendingRate - I.inflationExpectations,
		realPolicyRate: I.keyRate - I.inflationExpectations,
		rateGap: 0,
		policyStance: I.keyRate - I.inflationExpectations - I.rStar,
		carry: 0,
		creditGrowth: 6.3,
		creditTrendRatio: I.creditVolume / nominalGdp * 100,
		creditGap: 0,
		creditGapLag: 0,
		creditImpulse: 0,
		creditCrunch: false,
		bankCapitalAdequacy: I.bankCapital / (I.creditVolume * CONFIG.target.riskWeight) * 100,
		bankProfit: 2.2,
		loanLosses: 4.7,
		bankingRisk: 24,
		bankingRiskValue: 24,
		interestPayment: I.govDebt * I.effectiveDebtRate / 100,
		fiscalImpulse: 0,
		structuralBalancePctGdp: 0,
		projects: [],
		projectsBuilt: [],
		regionMods: {},
		regionShock: {},
		regionEvent: null,
		regionEventCooldown: 1,
		lastRegionResolution: null,
		projectReal: 0,
		warCampaign: null,
		annexed: [],
		campaignSpend: {},
		annexLoyalty: {},
		annexIntegrated: [],
		annexFunded: [],
		norlandRevanche: 0,
		revancheWarned: false,
		revancheCampaign: null,
		defenseCampaign: null,
		peaceTalks: null,
		treaty: null,
		relations: { ...RELATIONS_START },
		diploTreaties: {},
		diploSanctions: {},
		diploCooldown: {},
		deshtMobilized: 0,
		deshtCalm: 0,
		neighborEvent: null,
		diploLast: null,
		diploResolved: null,
		groupSupport: null,
		groupSupportPrev: null,
		groupMemory: [],
		groupDriversNow: null,
		groupUnrestCd: {},
		groupDemand: null,
		groupDemandCooldown: 0,
		lastGroupResolution: null,
		inflationRisk: 14,
		debtRisk: 24,
		recessionRisk: 12,
		currencyRisk: 20,
		activeCrises: [],
		regime: I.regime || "normal",
		recessionStreak: 0,
		recessionRecoverStreak: 0,
		regimeStreak: 1,
		demands: [],
		pandemicQuartersLeft: 0,
		warQuartersLeft: 0,
		warType: null,
		warByChoice: false,
		unrestActive: false,
		marketLockoutQuartersLeft: 0,
		defaultedEver: false,
		justDefaulted: false,
		stabilizationCred: 0,
		cbStance: 0,
		mofStance: 0,
		taxWedgeValue: 0,
		botHeadline: null,
		botDemand: null
	};
	const rev = computeRevenue(base, base);
	base.revenueParts = rev;
	base.govRevenue = rev.total;
	base.revenuePctGdp = rev.total / nominalGdp * 100;
	base.taxWedgeValue = taxWedge(base);
	base.sovereignFund = 0;
	base.fundPctGdp = 0;
	base.netDebtToGdp = I.govDebt / nominalGdp * 100;
	base.fundIncome = 0;
	base.govPurchasesNominal = I.govPurchasesReal;
	base.transfersNominal = I.transfersReal;
	base.govInvestmentNominal = I.govInvestmentReal;
	if ("budgetBalancePctGdp" in own && !("transfersReal" in own)) {
		const spend0 = I.govPurchasesReal + I.transfersReal + I.govInvestmentReal + base.interestPayment;
		const target = own.budgetBalancePctGdp * nominalGdp / 100;
		I.transfersReal = Math.max(0, I.transfersReal + (base.govRevenue - spend0) - target);
		base.transfersReal = I.transfersReal;
		base.transfersNominal = I.transfersReal;
	}
	base.govSpendingTotal = I.govPurchasesReal + I.transfersReal + I.govInvestmentReal + base.interestPayment;
	base.budgetBalance = base.govRevenue - base.govSpendingTotal;
	base.budgetBalancePctGdp = base.budgetBalance / nominalGdp * 100;
	base.structuralBalancePctGdp = base.budgetBalancePctGdp;
	base.primaryBalance = base.budgetBalance + base.interestPayment;
	base.debtToGdp = I.govDebt / nominalGdp * 100;
	base.interestToRevenue = base.interestPayment / base.govRevenue * 100;
	base.yield3m = base.keyRate + .2;
	base.yield1y = base.keyRate + .4;
	base.yield2y = base.keyRate + .7;
	base.yield5y = base.keyRate + 1.1;
	base.yield10y = base.keyRate + 1.5;
	base.curveSlope = 1.3;
	base.curveInverted = false;
	base.bondIndex = 1e3;
	base.bondReturn = 1.75;
	base.sovereignSpread = base.riskPremium * 100;
	base.corporateSpread = 190;
	base.stockIndex = 1e3;
	base.stockReturn = 0;
	base.equityRiskPremium = 3.2;
	base.earnings = CONFIG.shares.profits * I.gdp * (1 - I.profitTaxRate / 100);
	base.discountRate = base.yield10y + 3.2 - .62 * (2.3 + I.inflationExpectations);
	base.fairPE = 100 / base.discountRate;
	base.stockPE = base.fairPE;
	base.marketCap = 1100;
	base.marketCapPctGdp = 1100 / nominalGdp * 100;
	base.sectorBanks = 1e3;
	base.sectorIndustry = 1e3;
	base.sectorConsumer = 1e3;
	base.sectorResources = 1e3;
	base.reitIndex = 1e3;
	base.netInterestMargin = I.lendingRate - I.depositRate;
	base.bankROE = 6;
	base.bankPB = .7;
	base.fxVolatility = 6;
	base.volatilityIndex = 16;
	base.depositIndex = 100;
	base.fxIndex = I.exchangeRate;
	base.fxCarry = 1;
	base.corpBondIndex = 1e3;
	base.corpYield = base.yield5y + 1.9;
	base.corpReturn = 2;
	base.goldIndex = I.commodityIndex * I.exchangeRate / 100;
	base.bondShortIndex = 1e3;
	base.linkerIndex = 1e3;
	base.moneyMarketIndex = 1e3;
	base.worldEquityIndex = 1e3;
	base.reforms = {};
	base.politicalCapitalGain = 0;
	base.decreeRule = false;
	Object.assign(base, computeScores({
		...base,
		capitalRequirement: base.capitalRequirement
	}));
	base.taylorRate = taylorRate(base);
	return base;
}
const REGIME_INFO = {
	normal: {
		label: "Нормальный режим",
		color: "teal",
		text: "Выпуск близок к потенциалу, инфляция под контролем. Лучшее время для структурных решений: их эффект проявится через годы."
	},
	overheating: {
		label: "Перегрев",
		color: "gold",
		text: "Спрос выше производственных возможностей. Дополнительные расходы почти целиком уйдут в цены, а не в выпуск."
	},
	recession: {
		label: "Рецессия",
		color: "rust",
		text: "Выпуск ниже потенциала. Мультипликатор расходов высок, но длительная безработица поднимает её естественный уровень — шрамы останутся."
	},
	stagflation: {
		label: "Стагфляция",
		color: "rust",
		text: "Спад и инфляция одновременно. Любая политика чем-то жертвует: ставка вверх — глубже спад, ставка вниз — срыв ожиданий."
	},
	banking: {
		label: "Банковский кризис",
		color: "rust",
		text: "Капитал банков не покрывает потери, кредит сжимается, что само поднимает просрочку. Петля обратной связи работает против вас."
	},
	debt: {
		label: "Долговой кризис",
		color: "rust",
		text: "Премия за риск растёт быстрее, чем экономика. Каждый новый выпуск долга дороже предыдущего."
	},
	currency: {
		label: "Валютный кризис",
		color: "rust",
		text: "Курс переносится в цены. Защита резервами конечна, свободный курс — импорт инфляции."
	},
	deflation: {
		label: "Дефляционная ловушка",
		color: "blue",
		text: "Реальная ставка высока даже при нулевой ключевой. Обычная денежная политика теряет силу — нужен бюджет."
	},
	pandemic: {
		label: "Пандемия",
		color: "rust",
		text: "Вспышка заболевания одновременно сократила спрос и производственные возможности. Эффект растянут на несколько кварталов и постепенно сходит на нет."
	},
	war: {
		label: (e) => e.warByChoice ? "Военное положение" : "Война",
		color: "rust",
		text: (e) => e.warByChoice ? `Страна ведёт объявленную ею войну. Санкции сжали торговлю и инвестиции, капитал уходит, издержки растут — это прямая цена решения, а не внешний шок. Взамен открыты чрезвычайные полномочия, а рейтинг первые кварталы держится на сплочении.` : `Экономика в состоянии ${e.warType === "offensive" ? "наступательной войны: под санкциями сжались торговля и инвестиции, капитал уходит в защитные активы" : e.warType === "defensive" ? "оборонительной войны: удар смягчает иностранная помощь союзников, но торговля и инвестиции всё равно сжались" : "войны: торговля и инвестиции сжались, издержки растут, капитал уходит в защитные активы"}. Расходы на оборону, сделанные ещё до войны, смягчают удар.`
	}
};
const regimeInfoText = (info, economy) => typeof info.text === "function" ? info.text(economy) : info.text;
const regimeInfoLabel = (info, economy) => typeof info.label === "function" ? info.label(economy) : info.label;
// api/room.js
const REJOIN_COOLDOWN_MS = 6e4;
const RESERVE_MS = 6e5;
function seatAccessError(room, seat, login, now = Date.now()) {
	const accounts = room.accounts || {};
	const left = room.left || {};
	const mine = Object.entries(accounts).find(([sx, l]) => l === login && room.seats[sx]);
	if (mine) return mine[0] === seat ? "Вы уже на этом месте" : "Вы уже сидите в этой комнате на другом месте";
	const myLeft = left[login];
	if (myLeft && myLeft.kicked) return "Создатель комнаты убрал вас из этой партии";
	if (myLeft) {
		const wait = myLeft.at + REJOIN_COOLDOWN_MS - now;
		if (wait > 0) return `Вы только что вышли — вернуться можно через ${Math.ceil(wait / 1e3)} с`;
		if (myLeft.seat !== seat && !room.seats[myLeft.seat] && now - myLeft.at < RESERVE_MS) return "Вернуться можно только на своё прежнее место";
	}
	const holder = Object.entries(left).find(([l, x]) => l !== login && x.seat === seat && now - x.at < RESERVE_MS && !x.kicked);
	if (holder) return `Место держится за вышедшим игроком ещё ${Math.ceil((holder[1].at + RESERVE_MS - now) / 6e4)} мин`;
	return null;
}
const SEATS_BY_MODE = {
	policy: [
		"central_bank",
		"ministry_finance",
		"president"
	],
	trader: ["trader1", "trader2"]
};
const SEATS = [...SEATS_BY_MODE.policy, ...SEATS_BY_MODE.trader];
const seatsFor = (room) => SEATS_BY_MODE[room.mode === "trader" ? "trader" : "policy"];
const DIFFICULTY_IDS = new Set(DIFFICULTIES.map((d) => d.id));
const GOAL_IDS = new Set(GOALS$1.map((g) => g.id));
const FX_REGIME_IDS = new Set(FX_REGIMES.map((r) => r.id));
const CB_PERSONA_IDS = new Set(CB_PERSONAS.map((p) => p.id));
const MOF_PERSONA_IDS = new Set(MOF_PERSONAS.map((p) => p.id));
const PRES_PERSONA_IDS = new Set(PRESIDENT_PERSONAS.map((p) => p.id));
const randomOf = (list) => list[Math.floor(Math.random() * list.length)].id;
const pickPersona = (v, ids, list) => ids.has(v) ? v : randomOf(list);
const code = () => randomBytes(4).toString("hex").toUpperCase().slice(0, 5);
const token = () => randomUUID();
const cleanString = (v, maxLen) => typeof v === "string" ? v.slice(0, maxLen) : null;
const PRESENCE_TIMEOUT_MS = 12e3;
const QUARTER_TIMEOUT_MS = 3e5;
const SEAT_GROUP = {
	central_bank: "monetary",
	ministry_finance: "fiscal"
};
const LEVER_IDS_BY_GROUP = {
	monetary: LEVERS.filter((l) => l.group === "monetary").map((l) => l.id),
	fiscal: LEVERS.filter((l) => l.group === "fiscal").map((l) => l.id)
};
const pickFields = (obj, ids) => {
	const out = {};
	for (const id of ids) if (id in obj) out[id] = obj[id];
	return out;
};
function sanitizeRegionPlan(o, economy) {
	const src = o && typeof o === "object" ? o : {};
	const project = REGION_PROJECTS.find((p) => p.id === src.startProject);
	const ev = economy && economy.regionEvent;
	return {
		startProject: project && economy && !projectBlocker(project, economy) ? project.id : null,
		regionResponse: ev && (ev.options || []).some((x) => x.id === src.regionResponse) ? src.regionResponse : null,
		integrate: Array.isArray(src.integrate) && economy ? sanitizeIntegration(src.integrate, economy) : null,
		groupResponse: economy && economy.groupDemand && (economy.groupDemand.options || []).some((x) => x.id === src.groupResponse) ? src.groupResponse : null
	};
}
function sanitizeDecisions(base, submitted, seat, economy) {
	const out = { ...base };
	if (!submitted || typeof submitted !== "object") return out;
	const group = SEAT_GROUP[seat];
	for (const lever of LEVERS) {
		if (lever.group !== group) continue;
		const v = submitted[lever.id];
		const l = economy ? scaleLever(lever, economy) : lever;
		if (typeof v === "number" && Number.isFinite(v)) out[lever.id] = clamp(v, l.min, l.max);
	}
	if (group === "monetary") {
		if (FX_REGIME_IDS.has(submitted.fxRegime)) out.fxRegime = submitted.fxRegime;
		if (typeof submitted.emergency === "boolean") out.emergency = submitted.emergency;
		out.guidance = [
			"none",
			"cut",
			"hold",
			"hike"
		].includes(submitted.guidance) ? submitted.guidance : null;
	}
	if (group === "fiscal") {
		if (typeof submitted.sovereignDefault === "boolean") out.sovereignDefault = submitted.sovereignDefault;
		if (typeof submitted.imfProgram === "boolean") out.imfProgram = submitted.imfProgram;
		Object.assign(out, sanitizeRegionPlan(submitted, economy));
	}
	return out;
}
const PRES_ACTION_IDS = new Set(PRESIDENT_ACTIONS.map((a) => a.id));
const REQUEST_IDS = new Set(REQUESTS.map((r) => r.id));
const WAR_STANCE_IDS = new Set(WAR_STANCES.map((x) => x.id));
const DEFENSE_STANCE_IDS = new Set(DEFENSE_STANCES.map((x) => x.id));
function sanitizeWarOrder(o, economy) {
	if (!o || typeof o !== "object") return null;
	if (economy && economy.warType === "revanche") {
		if (!DEFENSE_STANCE_IDS.has(o.stance)) return null;
		const held = Object.keys((economy.revancheCampaign || {}).pressure || {}).filter((id) => !((economy.revancheCampaign || {}).lost || []).includes(id));
		return {
			stance: o.stance,
			target: held.includes(o.target) ? o.target : null
		};
	}
	if (economy && economy.warType === "defensive") {
		if (!DEFENSE_STANCE_IDS.has(o.stance)) return null;
		return {
			stance: o.stance,
			target: DEF_FRONT.includes(o.target) ? o.target : null
		};
	}
	if (!WAR_STANCE_IDS.has(o.stance)) return null;
	const camp = economy && economy.warCampaign || {
		progress: {},
		captured: []
	};
	return {
		stance: o.stance,
		target: warObjectiveOpen(o.target, camp) ? o.target : null
	};
}
function sanitizePresident(v, economy) {
	const o = v && typeof v === "object" ? v : {};
	return {
		region: sanitizeRegionPlan(o.region, economy),
		warOrder: sanitizeWarOrder(o.warOrder, economy),
		campaignPlan: sanitizeCampaignPlan(o.campaignPlan, economy),
		treaty: economy ? sanitizeTreaty(o.treaty, economy) : null,
		diplomacy: economy ? sanitizeDiplomacy(o.diplomacy, economy) : null,
		warTarget: [
			"north",
			"west",
			"southwest"
		].includes(o.warTarget) ? o.warTarget : null,
		actions: Array.isArray(o.actions) ? o.actions.filter((x) => PRES_ACTION_IDS.has(x)).slice(0, 4) : [],
		appointCb: CB_PERSONA_IDS.has(o.appointCb) ? o.appointCb : null,
		appointMof: MOF_PERSONA_IDS.has(o.appointMof) ? o.appointMof : null,
		directive: REQUEST_IDS.has(o.directive) ? o.directive : null,
		directiveStrength: Number.isFinite(o.directiveStrength) ? clamp(o.directiveStrength, .2, 4) : 1
	};
}
const SCENARIO_IDS = new Set(SCENARIOS.filter((sc) => !sc.noRoles).map((sc) => sc.id));
function freshRoom(opts) {
	const scenario = SCENARIO_IDS.has(opts.scenario) ? opts.scenario : "sandbox";
	const economy = {
		...makeInitialEconomy(scenario),
		...opts.kids ? { kidsMode: true } : {}
	};
	const mode = opts.mode === "trader" ? "trader" : "policy";
	const seats = SEATS_BY_MODE[mode];
	const zip = (v) => Object.fromEntries(seats.map((sx) => [sx, v]));
	return {
		id: opts.id,
		created: Date.now(),
		version: 1,
		mode,
		scenario,
		ownerToken: token(),
		isPublic: !!opts.public,
		difficulty: DIFFICULTY_IDS.has(opts.difficulty) ? opts.difficulty : "medium",
		goalCb: GOAL_IDS.has(opts.goalCb) ? opts.goalCb : "min_inflation",
		goalMof: GOAL_IDS.has(opts.goalMof) ? opts.goalMof : "living_standards",
		cbPersona: pickPersona(opts.cbPersona, CB_PERSONA_IDS, CB_PERSONAS),
		mofPersona: pickPersona(opts.mofPersona, MOF_PERSONA_IDS, MOF_PERSONAS),
		president: opts.president === null ? null : { persona: pickPersona(opts.president && opts.president.persona, PRES_PERSONA_IDS, PRESIDENT_PERSONAS) },
		presidentPlan: null,
		presidentLast: null,
		presidentDemand: null,
		presMemo: {
			lastReqId: null,
			ago: 99
		},
		promises: mode === "policy" && opts.president !== null ? pickPromises(economy) : null,
		seats: zip(null),
		names: zip(null),
		lastSeen: zip(null),
		economy,
		quarterIndex: 1,
		quarterStartedAt: Date.now(),
		decisions: defaultDecisions(economy),
		pendingImpulses: [],
		eventCooldowns: {},
		stories: [],
		history: [{
			q: 0,
			label: `${quarterLabel(1)} (старт)`,
			...economy
		}],
		news: [],
		report: "",
		reasons: null,
		submissions: zip(null),
		lastActions: {
			central_bank: null,
			ministry_finance: null
		},
		chat: [],
		portfolioValues: {}
	};
}
const slimPlan = (plan) => !plan ? null : {
	persona: plan.persona.id,
	personaName: plan.persona.name,
	personaTitle: plan.persona.title,
	actions: plan.actions,
	mood: plan.mood,
	quote: plan.quote,
	satisfaction: plan.satisfaction,
	appointBot: plan.appointBot,
	directive: plan.directive ? {
		reqId: plan.directive.reqId,
		branch: plan.directive.branch,
		label: plan.directive.req.label,
		ask: plan.directive.ask
	} : null
};
function planPresident(room, economy, cooldowns) {
	if (!room.president) return null;
	const humanCb = !!room.seats.central_bank;
	const humanMof = !!room.seats.ministry_finance;
	const playerBranch = humanCb && !humanMof ? "monetary" : humanMof && !humanCb ? "fiscal" : null;
	const memo = room.presMemo || {
		lastReqId: null,
		ago: 99
	};
	return slimPlan(botPresident(economy, room.president.persona, room.difficulty, {
		playerBranch,
		cooldowns: cooldowns || room.eventCooldowns || {},
		cbPersonaId: room.cbPersona,
		mofPersonaId: room.mofPersona,
		lastReqId: memo.lastReqId,
		lastDirectiveAgo: memo.ago
	}));
}
const publicView = (room) => {
	const lastSeen = room.lastSeen || {};
	const isConnected = (seat) => !!room.seats[seat] && !!lastSeen[seat] && Date.now() - lastSeen[seat] < PRESENCE_TIMEOUT_MS;
	const perSeat = (fn) => Object.fromEntries(SEATS.map((sx) => [sx, fn(sx)]));
	return {
		id: room.id,
		version: room.version,
		difficulty: room.difficulty,
		mode: room.mode === "trader" ? "trader" : "policy",
		scenario: room.scenario || "sandbox",
		isPublic: !!room.isPublic,
		now: Date.now(),
		quarterIndex: room.quarterIndex,
		quarterLabel: quarterLabel(room.quarterIndex),
		quarterStartedAt: room.quarterStartedAt,
		economy: room.economy,
		history: room.history,
		news: room.news.slice(0, 120),
		report: room.report,
		reasons: room.reasons,
		stories: room.stories,
		names: room.names,
		emblems: room.emblems || {},
		ready: perSeat((sx) => !!room.submissions[sx]),
		occupied: perSeat((sx) => !!room.seats[sx]),
		connected: perSeat(isConnected),
		lastActions: room.lastActions,
		goals: {
			central_bank: room.goalCb,
			ministry_finance: room.goalMof
		},
		personas: {
			central_bank: room.cbPersona || "pragmatic",
			ministry_finance: room.mofPersona || "technocrat"
		},
		presCooldowns: Object.fromEntries(Object.entries(room.eventCooldowns || {}).filter(([k]) => k.startsWith("pres:"))),
		president: room.president ? {
			...room.president,
			human: !!room.seats.president,
			plan: room.seats.president ? null : room.presidentPlan || null,
			demand: room.seats.president ? room.presidentDemand || null : null,
			last: room.presidentLast || null
		} : null,
		chat: room.chat || [],
		portfolioValues: room.portfolioValues || {},
		promises: room.promises || null
	};
};
function resolveQuarter(room) {
	const subs = room.submissions;
	const cbPersona = room.cbPersona || "pragmatic";
	const mofPersona = room.mofPersona || "technocrat";
	let cbAct = subs.central_bank ? null : botCentralBank(room.economy, cbPersona, room.difficulty);
	let mofAct = subs.ministry_finance ? null : botFinanceMinistry(room.economy, mofPersona, room.difficulty);
	let cbDecisions = cbAct ? cbAct.decisions : subs.central_bank.decisions;
	let mofDecisions = mofAct ? mofAct.decisions : subs.ministry_finance.decisions;
	const cbNewsAct = cbAct || describeHumanCbAction(room.economy, room.names.central_bank, cbDecisions);
	const mofNewsAct = mofAct || describeHumanMofAction(room.economy, room.names.ministry_finance, mofDecisions);
	let eff = {
		...room.decisions,
		...pickFields(cbDecisions, LEVER_IDS_BY_GROUP.monetary),
		fxRegime: "fxRegime" in cbDecisions ? cbDecisions.fxRegime : room.decisions.fxRegime,
		emergency: "emergency" in cbDecisions ? cbDecisions.emergency : room.decisions.emergency,
		...pickFields(mofDecisions, LEVER_IDS_BY_GROUP.fiscal)
	};
	const presRegion = subs.president && subs.president.president ? subs.president.president.region : null;
	eff.startProject = presRegion && presRegion.startProject || mofDecisions.startProject || null;
	eff.regionResponse = presRegion && presRegion.regionResponse || mofDecisions.regionResponse || null;
	if (room.economy.regionEvent && regionEventOwner(room.economy.regionEvent.id) === "president") eff.regionResponse = room.seats.president ? presRegion && presRegion.regionResponse || null : botPresidentRegion(room.economy, room.president ? room.president.persona : "technocrat");
	eff.integrate = presRegion && presRegion.integrate != null ? presRegion.integrate : mofDecisions.integrate ?? null;
	eff.groupResponse = presRegion && presRegion.groupResponse || mofDecisions.groupResponse || null;
	if (room.economy.warType === "offensive" && (room.economy.warQuartersLeft || 0) > 0) {
		const humanOrder = subs.president && subs.president.president ? subs.president.president.warOrder : null;
		eff.warOrder = humanOrder || (room.president && !room.seats.president ? botWarOrder(room.economy, room.president.persona) : null);
	}
	if (room.economy.warType === "revanche" && (room.economy.warQuartersLeft || 0) > 0) {
		const humanOrder = subs.president && subs.president.president ? subs.president.president.warOrder : null;
		eff.warOrder = humanOrder || (room.president && !room.seats.president ? botDefenseOrder(room.economy, room.president.persona) : null);
	}
	if (room.economy.warType === "defensive" && (room.economy.warQuartersLeft || 0) > 0) {
		const humanOrder = subs.president && subs.president.president ? subs.president.president.warOrder : null;
		eff.warOrder = humanOrder || (room.seats.president ? null : botFrontOrder(room.economy, room.president ? room.president.persona : "technocrat"));
	}
	if (room.economy.peaceTalks) {
		const humanTreaty = subs.president && subs.president.president ? subs.president.president.treaty : null;
		eff.treaty = room.seats.president ? humanTreaty : botTreaty(room.economy, room.president ? room.president.persona : "technocrat");
	}
	{
		const humanDiplo = subs.president && subs.president.president ? subs.president.president.diplomacy : null;
		const cap = Number.isFinite(room.economy.politicalCapital) ? room.economy.politicalCapital : 55;
		eff.diplomacy = room.seats.president ? humanDiplo : botDiplomacy(room.economy, room.president ? room.president.persona : "technocrat", room.president ? cap : 0);
	}
	const presSub = subs.president && subs.president.president;
	eff.campaignPlan = presSub ? presSub.campaignPlan : botCampaignPlan(room.economy);
	const humanSeat = !!room.seats.president;
	const humanPres = subs.president && subs.president.president ? subs.president.president : null;
	const demandOf = (reqId, strength) => {
		const req = REQUESTS.find((r) => r.id === reqId);
		if (!req) return null;
		return {
			reqId: req.id,
			branch: req.from === "ministry_finance" ? "monetary" : "fiscal",
			label: req.label,
			ask: askText(req, strength),
			strength
		};
	};
	const activeDemand = humanSeat ? room.presidentDemand || null : null;
	const newDemand = humanSeat && humanPres && humanPres.directive ? demandOf(humanPres.directive, humanPres.directiveStrength) : null;
	const plan = humanSeat ? {
		human: true,
		actions: humanPres ? humanPres.actions : [],
		appointBot: null,
		directive: activeDemand
	} : room.president ? room.presidentPlan : null;
	const extraImpulses = [...room.pendingImpulses || []];
	let presDirResult = null;
	let directiveMet = null;
	if (newDemand) eff = {
		...eff,
		presidentExtraSpend: 12
	};
	if (plan) {
		const persona = humanSeat ? null : getPresPersona(room.president.persona);
		eff = {
			...eff,
			presidentActive: true,
			presidentActions: plan.actions,
			presidentPatience: persona ? persona.patience : 1,
			presidentExtraSpend: eff.presidentExtraSpend || 0
		};
		if (humanPres) {
			if (humanPres.appointCb) eff.appointCb = humanPres.appointCb;
			if (humanPres.appointMof) eff.appointMof = humanPres.appointMof;
			if (humanPres.warTarget) eff.warTarget = humanPres.warTarget;
		}
		if (plan.appointBot) eff[plan.appointBot.kind === "central_bank" ? "appointCb" : "appointMof"] = plan.appointBot.persona;
		const dir = plan.directive;
		if (dir) {
			const seat = dir.branch === "monetary" ? "central_bank" : "ministry_finance";
			if (!!subs[seat]) {
				directiveMet = directiveProgress(dir.reqId, room.decisions, seat === "central_bank" ? cbDecisions : mofDecisions, room.economy, dir.strength);
				eff = {
					...eff,
					presidentDirectiveMet: directiveMet
				};
			} else {
				presDirResult = processPresidentialDirective(dir.reqId, room.economy, cbPersona, mofPersona, eff, dir.strength);
				if (presDirResult) {
					eff = { ...presDirResult.decisions };
					if (presDirResult.toCb) {
						cbDecisions = {
							...cbDecisions,
							...pickFields(eff, LEVER_IDS_BY_GROUP.monetary)
						};
						cbAct = redescribeCbAction(room.economy, cbPersona, eff);
					} else {
						mofDecisions = {
							...mofDecisions,
							...pickFields(eff, LEVER_IDS_BY_GROUP.fiscal)
						};
						mofAct = redescribeMofAction(room.economy, mofPersona, eff);
					}
					if (presDirResult.credibilityHit) extraImpulses.push(makeImpulse("cbCredibilityPush", presDirResult.credibilityHit, "Центральный банк исполнил указание президента", "fast", room.difficulty, "other"));
				}
			}
		}
	}
	const cbStance = clamp((eff.keyRate - room.economy.inflationExpectations - room.economy.rStar) / 3, -1, 1);
	const mofStance = clamp((eff.govSpending + eff.transfers * .6 + eff.govInvestment * .8) / 6, -1, 1);
	if (room.promises) eff = {
		...eff,
		promises: room.promises
	};
	const speaker = pressSpeakerSeat(room.seats);
	const speakerSub = speaker ? subs[speaker] : null;
	eff = {
		...eff,
		pressAnswer: speakerSub && speakerSub.pressAnswer ? speakerSub.pressAnswer : null
	};
	const res = simulateQuarter({
		economy: {
			...room.economy,
			cbStance,
			mofStance
		},
		decisions: eff,
		pendingImpulses: extraImpulses,
		eventCooldowns: room.eventCooldowns,
		difficulty: room.difficulty,
		quarterIndex: room.quarterIndex,
		stories: room.stories,
		botAction: cbAct || cbNewsAct,
		botActions: [mofAct || mofNewsAct]
	});
	if (plan && plan.directive) {
		const dir = plan.directive;
		const to = dir.branch === "monetary" ? "ЦБ" : "МИНФИН";
		if (presDirResult) res.newsEntries.unshift({
			id: `presdir${room.quarterIndex}`,
			cat: "gov",
			priority: 8,
			q: room.quarterIndex,
			qLabel: quarterLabel(room.quarterIndex),
			headline: `ПРЕЗИДЕНТ → ${to}: ${dir.label.toUpperCase()} — ${presDirResult.status === "accepted" ? "ИСПОЛНЕНО" : presDirResult.status === "partial" ? "ЧАСТИЧНО" : "ОТКАЗ"}`,
			text: `«${presDirResult.ask}» ${presDirResult.text}`
		});
		else {
			const verdict = directiveVerdict(directiveMet);
			const pct = Number.isFinite(directiveMet) ? Math.round(directiveMet * 100) : null;
			const word = verdict === "met" ? "ВЫПОЛНЕНО" : verdict === "partial" ? "ВЫПОЛНЕНО ЧАСТИЧНО" : verdict === "ignored" ? "ПРОИГНОРИРОВАНО" : "БЕЗ ОТВЕТА";
			res.newsEntries.unshift({
				id: `presdir${room.quarterIndex}`,
				cat: "gov",
				priority: 9,
				q: room.quarterIndex,
				qLabel: quarterLabel(room.quarterIndex),
				headline: `ПРЕЗИДЕНТ → ${to}: ${dir.label.toUpperCase()} — ${word}`,
				text: `«${dir.ask}» ${verdict === "met" ? "Ведомство пошло навстречу — администрация это отметила." : verdict === "partial" ? `Ведомство сделало примерно ${pct}% запрошенного. В администрации это считают полумерой.` : verdict === "ignored" ? "Ведомство поступило по-своему. В администрации президента это запомнят." : "Требование осталось без внятного ответа."}`
			});
		}
	}
	if (newDemand) {
		const to = newDemand.branch === "monetary" ? "ЦБ" : "МИНФИН";
		res.newsEntries.unshift({
			id: `presask${room.quarterIndex}`,
			cat: "gov",
			priority: 9,
			q: room.quarterIndex,
			qLabel: quarterLabel(room.quarterIndex),
			headline: `ПРЕЗИДЕНТ → ${to}: ${newDemand.label.toUpperCase()} — ТРЕБОВАНИЕ ВЫДВИНУТО`,
			text: `«${newDemand.ask}» Ответ ведомства будет виден по решениям следующего квартала.`
		});
	}
	if (room.quarterIndex === 1 && room.promises && room.promises.length) res.newsEntries.unshift({
		id: "promisesstart",
		cat: "gov",
		priority: 8,
		q: room.quarterIndex,
		qLabel: quarterLabel(room.quarterIndex),
		headline: "ПРИНЯТА ПРИСЯГА: ОБЪЯВЛЕНЫ ПРЕДВЫБОРНЫЕ ОБЕЩАНИЯ",
		text: `На этот срок заявлено: ${room.promises.map((p) => `«${p.label}» — ${p.text.toLowerCase()}`).join("; ")}. К дню голосования по каждому подведут итог — сдержано оно или нет.`
	});
	let nextPromises = room.promises;
	if (room.promises && res.economy.electionResult) {
		const er = res.economy.electionResult;
		const kept = room.promises.map((p) => evaluatePromise(p, res.economy).met);
		const keptCount = Number.isFinite(res.economy.promisesKept) ? res.economy.promisesKept : kept.filter(Boolean).length;
		const broken = room.promises.length - keptCount;
		res.newsEntries.unshift({
			id: `promises${room.quarterIndex}`,
			cat: "gov",
			priority: 9,
			q: room.quarterIndex,
			qLabel: quarterLabel(room.quarterIndex),
			headline: `ОБЕЩАНИЯ У УРНЫ: СДЕРЖАНО ${keptCount} ИЗ ${room.promises.length}`,
			text: `${room.promises.map((p, i) => `«${p.label}» — ${kept[i] ? "сдержано" : "провалено"}`).join("; ")}. ${keptCount > broken ? `Это добавило власти примерно ${fmt1((keptCount - broken) * 2.2)} п.п. голосов.` : keptCount < broken ? `Это стоило власти примерно ${fmt1((broken - keptCount) * 2.2)} п.п. голосов.` : "На итог голосования обещания в сумме не повлияли."}`
		});
		if (er === "incumbent") {
			nextPromises = pickPromises(res.economy);
			res.newsEntries.unshift({
				id: `newpromises${room.quarterIndex}`,
				cat: "gov",
				priority: 8,
				q: room.quarterIndex,
				qLabel: quarterLabel(room.quarterIndex),
				headline: "НОВЫЙ СРОК: ОБЪЯВЛЕНЫ ПРЕДВЫБОРНЫЕ ОБЕЩАНИЯ",
				text: `На новый срок заявлено: ${nextPromises.map((p) => `«${p.label}» — ${p.text.toLowerCase()}`).join("; ")}.`
			});
		}
	}
	let nextCbPersona = humanPres && humanPres.appointCb || (plan && plan.appointBot && plan.appointBot.kind === "central_bank" ? plan.appointBot.persona : cbPersona);
	let nextMofPersona = humanPres && humanPres.appointMof || (plan && plan.appointBot && plan.appointBot.kind === "ministry_finance" ? plan.appointBot.persona : mofPersona);
	{
		const er = res.economy.electionResult;
		if (er && er !== "incumbent") {
			if (!room.seats.ministry_finance) {
				const np = personaAfterElection("ministry_finance", res.economy);
				if (np !== nextMofPersona) {
					nextMofPersona = np;
					res.newsEntries.unshift({
						id: `pers${room.quarterIndex}`,
						cat: "gov",
						priority: 9,
						q: room.quarterIndex,
						qLabel: quarterLabel(room.quarterIndex),
						headline: `НОВЫЙ МИНИСТР ФИНАНСОВ: ${getMofPersona(np).name.toUpperCase()}`,
						text: `${getMofPersona(np).title}. ${getMofPersona(np).desc} Другому месту предстоит работать с другим бюджетом и другой логикой расходов.`
					});
				}
			}
			if (!room.seats.central_bank && er === "landslide") {
				const np = personaAfterElection("central_bank", res.economy);
				if (np !== nextCbPersona) {
					nextCbPersona = np;
					res.newsEntries.unshift({
						id: `perscb${room.quarterIndex}`,
						cat: "cb",
						priority: 9,
						q: room.quarterIndex,
						qLabel: quarterLabel(room.quarterIndex),
						headline: `СМЕНА ГЛАВЫ ЦЕНТРАЛЬНОГО БАНКА: ${getCbPersona(np).name.toUpperCase()}`,
						text: `${getCbPersona(np).title}. ${getCbPersona(np).desc} Смена руководства ЦБ после выборов — всегда вопрос к независимости политики и к тому, чего стоят её обещания.`
					});
				}
			}
		}
	}
	const presMemo = plan && plan.directive ? {
		lastReqId: plan.directive.reqId,
		ago: 0
	} : {
		lastReqId: (room.presMemo || {}).lastReqId || null,
		ago: Math.min(99, ((room.presMemo || {}).ago ?? 99) + 1)
	};
	const afterPresident = {
		...room,
		cbPersona: nextCbPersona,
		mofPersona: nextMofPersona,
		presMemo,
		eventCooldowns: res.eventCooldowns
	};
	return {
		...afterPresident,
		economy: res.economy,
		history: [...room.history, {
			q: room.quarterIndex,
			label: quarterLabel(room.quarterIndex),
			...res.economy
		}].slice(-160),
		news: [...res.newsEntries, ...room.news].slice(0, 240),
		report: res.report,
		reasons: res.reasons,
		promises: nextPromises,
		pendingImpulses: res.pendingImpulses,
		eventCooldowns: res.eventCooldowns,
		stories: res.stories,
		decisions: defaultDecisions(res.economy, eff),
		quarterIndex: room.quarterIndex + 1,
		quarterStartedAt: Date.now(),
		presidentPlan: room.seats.president ? null : planPresident(afterPresident, res.economy, res.eventCooldowns),
		presidentDemand: humanSeat ? newDemand : null,
		presidentLast: plan && (plan.directive || plan.actions.length || newDemand) ? {
			label: plan.directive ? plan.directive.label : null,
			branch: plan.directive ? plan.directive.branch : null,
			directiveMet,
			status: presDirResult ? presDirResult.status : null,
			actions: plan.actions.map((idx) => (PRES_BY_ID[idx] || {}).label).filter(Boolean)
		} : room.presidentLast || null,
		submissions: Object.fromEntries(SEATS.map((sx) => [sx, seatsFor(room).includes(sx) ? null : room.submissions[sx]])),
		lastActions: {
			central_bank: {
				...cbAct ? {
					bot: true,
					timedOut: !!room.seats.central_bank,
					note: cbAct.note,
					quote: cbAct.quote
				} : {
					bot: false,
					note: subs.central_bank.note || null
				},
				levers: {
					...pickFields(eff, LEVER_IDS_BY_GROUP.monetary),
					fxRegime: eff.fxRegime,
					emergency: !!eff.emergency
				}
			},
			ministry_finance: {
				...mofAct ? {
					bot: true,
					timedOut: !!room.seats.ministry_finance,
					note: mofAct.note,
					quote: mofAct.quote
				} : {
					bot: false,
					note: subs.ministry_finance.note || null
				},
				levers: {
					govSpending: eff.govSpending,
					transfers: eff.transfers,
					govInvestment: eff.govInvestment
				}
			}
		},
		version: room.version + 1
	};
}
function maybeForceResolve(room) {
	if (SEATS.every((sx) => room.submissions[sx] || !room.seats[sx])) return room;
	const startedAt = room.quarterStartedAt || room.created || 0;
	if (Date.now() - startedAt < QUARTER_TIMEOUT_MS) return room;
	return resolveQuarter(room);
}
async function handleRequest$1(req, res) {
	if (req.method === "GET") {
		const { id, since, seat, token: seatToken, list } = req.query;
		if (list === "public") {
			const ids = await listPublicRoomIds();
			const rooms = [];
			for (const rid of ids) {
				const r = await getRoom(rid);
				if (!r) {
					await removePublicRoom(rid);
					continue;
				}
				const seatsList = seatsFor(r);
				rooms.push({
					id: r.id,
					mode: r.mode === "trader" ? "trader" : "policy",
					difficulty: r.difficulty,
					president: !!r.president,
					quarterIndex: r.quarterIndex,
					created: r.created,
					seatsTotal: seatsList.length,
					seatsFree: seatsList.filter((sx) => !r.seats[sx]).length,
					activeCrises: r.economy && r.economy.activeCrises || [],
					scenario: r.scenario || "sandbox",
					kids: !!(r.economy && r.economy.kidsMode)
				});
			}
			rooms.sort((a, b) => b.created - a.created);
			return res.status(200).json({ rooms: rooms.slice(0, 40) });
		}
		let room = await getRoom(String(id || "").toUpperCase());
		if (!room) return res.status(404).json({ error: "Комната не найдена" });
		const forceResolved = maybeForceResolve(room);
		if (forceResolved !== room) {
			room = forceResolved;
			await setRoom(room.id, room);
		}
		if (SEATS.includes(seat) && room.seats[seat] && room.seats[seat] === seatToken) {
			room.lastSeen = {
				...room.lastSeen,
				[seat]: Date.now()
			};
			await setRoom(room.id, room);
		}
		const lastSeen = room.lastSeen || {
			central_bank: null,
			ministry_finance: null
		};
		if (!SEATS.some((sx) => room.seats[sx] && (!lastSeen[sx] || Date.now() - lastSeen[sx] >= PRESENCE_TIMEOUT_MS)) && since && Number(since) === room.version) return res.status(200).json({
			unchanged: true,
			version: room.version
		});
		return res.status(200).json({
			storage: hasKv() ? "kv" : "memory",
			room: publicView(room)
		});
	}
	if (req.method !== "POST") return res.status(405).json({ error: "Только GET и POST" });
	let body;
	try {
		body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
	} catch {
		return res.status(400).json({ error: "Некорректный JSON" });
	}
	if (!body || typeof body !== "object") return res.status(400).json({ error: "Некорректное тело запроса" });
	const { action } = body;
	if (action === "create") {
		const id = code();
		const president = body.president === null || body.president && body.president.enabled === false ? null : body.president || {};
		const base = freshRoom({
			id,
			mode: body.mode,
			difficulty: body.difficulty,
			goalCb: body.goalCb,
			goalMof: body.goalMof,
			cbPersona: body.cbPersona,
			mofPersona: body.mofPersona,
			president,
			public: !!body.public,
			scenario: body.scenario,
			kids: !!body.kids
		});
		const room = {
			...base,
			presidentPlan: planPresident(base, base.economy, {})
		};
		await setRoom(id, room);
		if (room.isPublic) await addPublicRoom(id);
		return res.status(200).json({
			id,
			ownerToken: room.ownerToken,
			storage: hasKv() ? "kv" : "memory",
			room: publicView(room)
		});
	}
	if (action === "join") {
		const id = String(body.id || "").toUpperCase();
		const seat = body.seat;
		if (!SEATS.includes(seat)) return res.status(400).json({ error: "Неизвестная роль" });
		const user = await userBySession(body.session);
		if (!user) return res.status(401).json({ error: "Для игры по сети войдите в профиль" });
		if (isBlocked(user)) return res.status(403).json({
			error: "Аккаунт заблокирован до смены ника",
			blocked: true
		});
		let firstTime = false;
		const out = await withRoom(id, (room) => {
			if (!seatsFor(room).includes(seat)) return {
				error: "Эта роль недоступна в этом режиме партии",
				status: 400
			};
			if (seat === "president" && !room.president) return {
				error: "В этой комнате президента нет",
				status: 400
			};
			if (room.seats[seat]) return {
				error: "Место уже занято",
				status: 409
			};
			if (kidsModeOf(user) && !(room.economy && room.economy.kidsMode)) return {
				error: "Эта партия без детского режима — выберите другую",
				status: 403
			};
			const denied = seatAccessError(room, seat, user.login);
			if (denied) return {
				error: denied,
				status: 409
			};
			firstTime = !(room.everJoined || []).includes(user.login);
			const left = { ...room.left };
			delete left[user.login];
			const t = token();
			const next = {
				...room,
				seats: {
					...room.seats,
					[seat]: t
				},
				names: {
					...room.names,
					[seat]: nameBanned(user) ? nameForOthers(null, user.login) : user.name
				},
				emblems: {
					...room.emblems,
					[seat]: user.emblem || "star"
				},
				accounts: {
					...room.accounts,
					[seat]: user.login
				},
				left,
				everJoined: firstTime ? [...room.everJoined || [], user.login].slice(-20) : room.everJoined,
				version: room.version + 1,
				__token: t
			};
			return {
				...next,
				presidentPlan: planPresident(next, next.economy, next.eventCooldowns)
			};
		});
		if (out.error) return res.status(out.status || 400).json({ error: out.error });
		const t = out.room.__token;
		delete out.room.__token;
		await setRoom(id, out.room);
		if (out.room.isPublic && seatsFor(out.room).every((sx) => out.room.seats[sx])) await removePublicRoom(id);
		if (firstTime) await bumpStats(user.login, {
			rooms: 1,
			lastRoom: id
		});
		return res.status(200).json({
			token: t,
			seat,
			storage: hasKv() ? "kv" : "memory",
			room: publicView(out.room)
		});
	}
	if (action === "submit") {
		const out = await withRoom(String(body.id || "").toUpperCase(), (room) => {
			const seat = body.seat;
			if (!SEATS.includes(seat)) return {
				error: "Неизвестная роль",
				status: 400
			};
			if (room.seats[seat] && room.seats[seat] !== body.token) return {
				error: "Неверный токен",
				status: 403
			};
			const decisions = sanitizeDecisions(room.decisions, body.decisions, seat, room.economy);
			const presidentMove = seat === "president" ? sanitizePresident(body.president, room.economy) : null;
			const portfolioValues = Number.isFinite(body.portfolioValue) ? {
				...room.portfolioValues,
				[seat]: clamp(body.portfolioValue, 0, 1e9)
			} : room.portfolioValues;
			const next = {
				...room,
				submissions: {
					...room.submissions,
					[seat]: {
						decisions,
						president: presidentMove,
						note: cleanString(body.note, 280),
						pressAnswer: body.decisions && PRESS_OPTION_IDS.has(body.decisions.pressAnswer) ? body.decisions.pressAnswer : null
					}
				},
				portfolioValues,
				version: room.version + 1
			};
			return SEATS.every((sx) => next.submissions[sx] || !next.seats[sx]) ? resolveQuarter(next) : next;
		});
		if (out.error) return res.status(out.status || 400).json({ error: out.error });
		if (out.room.accounts) {
			if (SEATS.every((sx) => !out.room.submissions[sx])) await Promise.all(SEATS.filter((sx) => out.room.seats[sx] && out.room.accounts[sx]).map((sx) => bumpStats(out.room.accounts[sx], { quarters: 1 })));
		}
		return res.status(200).json({ room: publicView(out.room) });
	}
	if (action === "report_portfolio") {
		const id = String(body.id || "").toUpperCase();
		const seat = body.seat;
		if (!SEATS.includes(seat)) return res.status(400).json({ error: "Неизвестная роль" });
		if (!Number.isFinite(body.value)) return res.status(400).json({ error: "Некорректное значение" });
		const out = await withRoom(id, (room) => {
			if (room.seats[seat] && room.seats[seat] !== body.token) return {
				error: "Неверный токен",
				status: 403
			};
			return {
				...room,
				portfolioValues: {
					...room.portfolioValues,
					[seat]: clamp(body.value, 0, 1e9)
				},
				version: room.version + 1
			};
		});
		if (out.error) return res.status(out.status || 400).json({ error: out.error });
		return res.status(200).json({ room: publicView(out.room) });
	}
	if (action === "chat") {
		const id = String(body.id || "").toUpperCase();
		const seat = body.seat;
		if (!SEATS.includes(seat)) return res.status(400).json({ error: "Неизвестная роль" });
		const text = cleanString(body.text, 500);
		if (!text || !text.trim()) return res.status(400).json({ error: "Пустое сообщение" });
		const out = await withRoom(id, (room) => {
			if (room.seats[seat] && room.seats[seat] !== body.token) return {
				error: "Неверный токен",
				status: 403
			};
			const entry = {
				seat,
				text: text.trim(),
				at: Date.now()
			};
			const chat = [...room.chat || [], entry].slice(-60);
			return {
				...room,
				chat,
				version: room.version + 1
			};
		});
		if (out.error) return res.status(out.status || 400).json({ error: out.error });
		return res.status(200).json({ room: publicView(out.room) });
	}
	if (action === "unsubmit") {
		const out = await withRoom(String(body.id || "").toUpperCase(), (room) => ({
			...room,
			submissions: {
				...room.submissions,
				[body.seat]: null
			},
			version: room.version + 1
		}));
		if (out.error) return res.status(out.status || 400).json({ error: out.error });
		return res.status(200).json({ room: publicView(out.room) });
	}
	if (action === "set_difficulty") {
		const id = String(body.id || "").toUpperCase();
		const seat = body.seat;
		if (!SEATS.includes(seat)) return res.status(400).json({ error: "Неизвестная роль" });
		if (!DIFFICULTY_IDS.has(body.difficulty)) return res.status(400).json({ error: "Неизвестная сложность" });
		const out = await withRoom(id, (room) => {
			if (room.seats[seat] && room.seats[seat] !== body.token) return {
				error: "Неверный токен",
				status: 403
			};
			return {
				...room,
				difficulty: body.difficulty,
				version: room.version + 1
			};
		});
		if (out.error) return res.status(out.status || 400).json({ error: out.error });
		return res.status(200).json({ room: publicView(out.room) });
	}
	if (action === "leave") {
		const id = String(body.id || "").toUpperCase();
		const seat = body.seat;
		if (!SEATS.includes(seat)) return res.status(400).json({ error: "Неизвестная роль" });
		let leaver = null;
		const out = await withRoom(id, (room) => {
			if (room.seats[seat] && room.seats[seat] !== body.token) return {
				error: "Неверный токен",
				status: 403
			};
			leaver = (room.accounts || {})[seat] || null;
			const accounts = { ...room.accounts };
			delete accounts[seat];
			return {
				...room,
				seats: {
					...room.seats,
					[seat]: null
				},
				names: {
					...room.names,
					[seat]: null
				},
				emblems: {
					...room.emblems,
					[seat]: null
				},
				submissions: {
					...room.submissions,
					[seat]: null
				},
				lastSeen: {
					...room.lastSeen,
					[seat]: null
				},
				accounts,
				left: leaver ? {
					...room.left,
					[leaver]: {
						seat,
						at: Date.now()
					}
				} : room.left,
				version: room.version + 1
			};
		});
		if (out.error) return res.status(out.status || 400).json({ error: out.error });
		if (leaver) await bumpStats(leaver, { leaves: 1 });
		if (out.room.isPublic) await addPublicRoom(id);
		return res.status(200).json({ room: publicView(out.room) });
	}
	if (action === "kick") {
		const id = String(body.id || "").toUpperCase();
		const seat = body.seat;
		if (!SEATS.includes(seat)) return res.status(400).json({ error: "Неизвестная роль" });
		const out = await withRoom(id, (room) => {
			if (room.ownerToken !== body.ownerToken) return {
				error: "Только владелец лобби может кикать",
				status: 403
			};
			const kicked = (room.accounts || {})[seat] || null;
			const accounts = { ...room.accounts };
			delete accounts[seat];
			return {
				...room,
				seats: {
					...room.seats,
					[seat]: null
				},
				names: {
					...room.names,
					[seat]: null
				},
				emblems: {
					...room.emblems,
					[seat]: null
				},
				submissions: {
					...room.submissions,
					[seat]: null
				},
				lastSeen: {
					...room.lastSeen,
					[seat]: null
				},
				accounts,
				left: kicked ? {
					...room.left,
					[kicked]: {
						seat,
						at: Date.now(),
						kicked: true
					}
				} : room.left,
				version: room.version + 1
			};
		});
		if (out.error) return res.status(out.status || 400).json({ error: out.error });
		if (out.room.isPublic) await addPublicRoom(id);
		return res.status(200).json({ room: publicView(out.room) });
	}
	return res.status(400).json({ error: "Неизвестное действие" });
}
async function handler$1(req, res) {
	try {
		return await handleRequest$1(req, res);
	} catch (err) {
		console.error("room handler error:", err);
		return res.status(500).json({ error: "Внутренняя ошибка сервера" });
	}
}
// src/textbook/learn-state.js
const GOALS = [
	1,
	2,
	3,
	5
];
const MAX_KEYS$1 = 300;
const emptyLearn = () => ({
	lessons: {},
	units: {},
	levels: {},
	goal: 1,
	goalAt: 0,
	xp: {},
	done: {},
	types: {},
	runs: {
		started: 0,
		finished: 0,
		abandoned: 0
	},
	quits: {},
	quitAt: {},
	mistakes: [],
	hinted: [],
	solved: {},
	unhint: {},
	profile: {
		goal: null,
		minutes: null,
		knows: false,
		at: 0
	},
	placement: {
		at: 0,
		opened: []
	},
	run: {
		n: 0,
		at: 0
	},
	topics: {},
	recent: "",
	recentAt: 0,
	daily: {},
	coins: {},
	spent: {},
	claimed: {},
	owned: {},
	skipped: {},
	wear: {
		head: null,
		face: null,
		neck: null,
		hand: null,
		frame: null,
		at: 0
	},
	freezeBuy: {},
	frozen: {},
	policyAt: 0,
	policyOff: 0,
	policyLapse: 0,
	premiums: {},
	monthPlan: {},
	seen: {},
	best: {},
	boost: 0,
	piggy: {},
	piggyOut: {},
	piggyTop: {},
	piggyAdd: {},
	garden: {},
	harvest: {},
	water: {},
	shown: {},
	read: {},
	readGem: {},
	gems: {},
	met: {},
	fixed: {},
	books: {},
	graphs: {},
	draws: {},
	fines: {}
});
const PROFILE_GOALS = [
	"exam",
	"olymp",
	"uni",
	"self"
];
const PROFILE_MINUTES = [
	5,
	10,
	15,
	20
];
const SLOTS = [
	"head",
	"face",
	"neck",
	"hand",
	"frame",
	"desk",
	"theme"
];
const MAX_SEEN = 800;
const MAX_BEST = 40;
const TOPIC_WINDOW = 20;
const dayOf = (ts) => {
	const d = new Date(ts);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};
function mergeRun(a, b, later) {
	const za = a.z || 0;
	const zb = b.z || 0;
	if (za !== zb) return za > zb ? a : b;
	return later(a, b);
}
const DAILY_FIELDS = [
	"l",
	"n",
	"p",
	"a",
	"c",
	"s",
	"r",
	"rc",
	"g",
	"pr",
	"h",
	"w"
];
const fin$1 = (v) => Number.isFinite(v) ? v : 0;
const cnt = (v, hi = 1e7) => Math.max(0, Math.min(hi, Math.round(fin$1(v))));
const okKey$1 = (k) => typeof k === "string" && k.length > 0 && k.length <= 64;
const isDay = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);
const obj = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const monthPlanMap = (v) => {
	const out = {};
	Object.keys(obj(v)).filter((k) => /^\d{4}-\d{2}$/.test(k)).sort().slice(-24).forEach((k) => {
		const p = obj(v[k]);
		const target = cnt(p.target, 1e5);
		if (target > 0) out[k] = {
			target,
			why: typeof p.why === "string" ? p.why.slice(0, 200) : "",
			at: cnt(p.at, 0x5af3107a4000),
			...typeof p.kind === "string" && /^[a-z]{2,12}$/.test(p.kind) ? { kind: p.kind } : {},
			...p.v === 2 ? { v: 2 } : {}
		};
	});
	return out;
};
const mergeMonthPlan = (a, b) => {
	const out = { ...a };
	Object.entries(b).forEach(([k, p]) => {
		const c = out[k];
		const pv = p.v || 0;
		const cv = c ? c.v || 0 : -1;
		out[k] = !c || pv > cv || pv === cv && (p.at < c.at || p.at === c.at && (p.target < c.target || p.target === c.target && String(p.kind || "") < String(c.kind || ""))) ? p : c;
	});
	return out;
};
const dayMap = (v, hi) => {
	const out = {};
	Object.keys(obj(v)).filter(isDay).sort().slice(-400).forEach((k) => {
		const x = cnt(v[k], hi);
		if (x > 0) out[k] = x;
	});
	return out;
};
const LESSON_SPLITS = [{
	part: "sc-i1b",
	from: "sc-i1",
	past: "sc-l1"
}];
const applySplits = (lessons) => {
	LESSON_SPLITS.forEach(({ part, from, past }) => {
		const src = lessons[from];
		const next = lessons[past];
		if (src && src.runs > 0 && next && next.runs > 0 && !lessons[part]) lessons[part] = {
			at: src.at,
			runs: 1,
			best: src.best
		};
	});
	return lessons;
};
function normalizeLearn(raw) {
	const r = obj(raw);
	const e = emptyLearn();
	const lessons = {};
	Object.keys(obj(r.lessons)).filter(okKey$1).slice(0, MAX_KEYS$1).forEach((k) => {
		const l = obj(r.lessons[k]);
		const gem = cnt(l.diamond, 0x5af3107a4000);
		lessons[k] = {
			at: cnt(l.at, 0x5af3107a4000),
			runs: cnt(l.runs, 1e5),
			best: cnt(l.best, 100),
			...gem ? { diamond: gem } : {},
			...l.held ? { held: 1 } : {}
		};
	});
	applySplits(lessons);
	const units = {};
	Object.keys(obj(r.units)).filter(okKey$1).slice(0, MAX_KEYS$1).forEach((k) => {
		const u = obj(r.units[k]);
		const t = cnt(u.tested, 0x5af3107a4000);
		const ace = cnt(u.ace, 0x5af3107a4000);
		if (t) units[k] = {
			tested: t,
			...ace ? { ace } : {}
		};
	});
	const levels = {};
	Object.keys(obj(r.levels)).filter(okKey$1).slice(0, 20).forEach((k) => {
		const v = obj(r.levels[k]);
		const at = cnt(v.at, 0x5af3107a4000);
		const ok = cnt(v.ok, 0x5af3107a4000);
		if (at) levels[k] = {
			at,
			best: cnt(v.best, 100),
			...ok ? { ok } : {}
		};
	});
	const types = {};
	Object.keys(obj(r.types)).filter(okKey$1).slice(0, 20).forEach((k) => {
		const t = obj(r.types[k]);
		const n = cnt(t.n);
		types[k] = {
			n,
			ok: Math.min(n, cnt(t.ok)),
			ms: cnt(t.ms, 0xe8d4a51000)
		};
	});
	const smallMap = (v) => {
		const out = {};
		Object.keys(obj(v)).filter(okKey$1).slice(0, 40).forEach((k) => {
			const x = cnt(v[k]);
			if (x) out[k] = x;
		});
		return out;
	};
	const runs = obj(r.runs);
	const started = cnt(runs.started);
	const recentTs = (v) => Object.fromEntries(Object.entries(tsMap$1(v, 5e3)).sort((a, b) => a[1] - b[1]).slice(-200));
	const solved = recentTs(r.solved);
	const unhint = recentTs(r.unhint);
	return {
		lessons,
		units,
		levels,
		types,
		goal: GOALS.includes(r.goal) ? r.goal : e.goal,
		goalAt: cnt(r.goalAt, 0x5af3107a4000),
		xp: dayMap(r.xp, 1e6),
		done: dayMap(r.done, 1e3),
		runs: {
			started,
			finished: Math.min(started || cnt(runs.finished), cnt(runs.finished)),
			abandoned: cnt(runs.abandoned)
		},
		quits: smallMap(r.quits),
		quitAt: smallMap(r.quitAt),
		mistakes: (Array.isArray(r.mistakes) ? r.mistakes : []).filter((m) => m && okKey$1(m.id)).map((m) => ({
			id: m.id,
			at: cnt(m.at, 0x5af3107a4000)
		})).filter((m) => m.at > (solved[m.id] || 0)).slice(-60),
		hinted: (Array.isArray(r.hinted) ? r.hinted : []).filter((m) => m && okKey$1(m.id)).map((m) => ({
			id: m.id,
			at: cnt(m.at, 0x5af3107a4000)
		})).filter((m) => m.at > (unhint[m.id] || 0)).slice(-60),
		solved,
		unhint,
		...normalizeProgram(r)
	};
}
const tsMap$1 = (v, limit) => {
	const out = {};
	Object.keys(obj(v)).filter(okKey$1).slice(0, limit).forEach((k) => {
		const t = cnt(v[k], 0x5af3107a4000);
		if (t) out[k] = t;
	});
	return out;
};
const countMap = (v, limit, hi) => {
	const out = {};
	Object.keys(obj(v)).filter(okKey$1).slice(0, limit).forEach((k) => {
		const x = cnt(v[k], hi);
		if (x) out[k] = x;
	});
	return out;
};
const DATED_CLAIMS = [
	["q:", 250],
	["dust:", 30],
	["g:", 400]
];
function claimedMap(v) {
	const all = tsMap$1(v, 5e4);
	const keys = Object.keys(all);
	const dated = (k) => DATED_CLAIMS.some(([p]) => k.startsWith(p));
	const keep = [...keys.filter((k) => !dated(k)), ...DATED_CLAIMS.flatMap(([p, n]) => keys.filter((k) => k.startsWith(p)).sort().slice(-n))];
	const out = {};
	keep.forEach((k) => {
		out[k] = all[k];
	});
	return out;
}
const piggyMap = (v) => {
	const out = {};
	Object.keys(obj(v)).filter((k) => /^\d{10,15}$/.test(k)).sort().slice(-40).forEach((k) => {
		const x = cnt(v[k], 1e6);
		if (x) out[k] = x;
	});
	return out;
};
const piggyTopMap = (v) => {
	const out = {};
	Object.keys(obj(v)).filter((k) => /^\d{10,15}$/.test(k)).sort().slice(-40).forEach((k) => {
		if (v[k]) out[k] = 1;
	});
	return out;
};
const piggyAddMap = (v) => {
	const out = {};
	Object.keys(obj(v)).filter((k) => /^\d{10,15}$/.test(k) && /^\d{10,15}:\d{1,7}$/.test(String(v[k]))).sort().slice(-200).forEach((k) => {
		out[k] = String(v[k]);
	});
	return out;
};
const TIME_KEY = /^\d{10,15}$/;
const gardenMap = (v) => {
	const out = {};
	Object.keys(obj(v)).filter((k) => TIME_KEY.test(k) && typeof v[k] === "string" && /^[a-z]{2,20}@\d{1,2}$/.test(v[k])).sort().slice(-200).forEach((k) => {
		out[k] = v[k];
	});
	return out;
};
const waterMap = (v) => {
	const out = {};
	Object.keys(obj(v)).filter((k) => TIME_KEY.test(k) && TIME_KEY.test(String(v[k]))).sort().slice(-400).forEach((k) => {
		out[k] = String(v[k]);
	});
	return out;
};
const harvestMap = (v) => {
	const out = {};
	Object.keys(obj(v)).filter((k) => TIME_KEY.test(k)).sort().slice(-200).forEach((k) => {
		const x = cnt(v[k], 0x5af3107a4000);
		if (x) out[k] = x;
	});
	return out;
};
const fineRec = (v) => {
	const f = obj(v);
	const items = {};
	Object.keys(obj(f.items)).filter(okKey$1).slice(0, 200).forEach((k) => {
		const t = cnt(f.items[k], 0x5af3107a4000);
		if (t) items[k] = t;
	});
	const at = cnt(f.at, 0x5af3107a4000);
	const pg = obj(f.piggy);
	const pgAt = cnt(pg.at, 0x5af3107a4000);
	return at ? {
		at,
		coins: cnt(f.coins, 1e7),
		refund: cnt(f.refund, 1e7),
		items,
		...pgAt ? { piggy: {
			at: pgAt,
			n: cnt(pg.n, 1e7)
		} } : {}
	} : null;
};
const finesMap = (v) => Object.fromEntries(Object.keys(obj(v)).filter(okKey$1).slice(0, 20).map((k) => [k, fineRec(v[k])]).filter(([, f]) => f));
const earlierFine = (a, b) => !a ? b : !b ? a : b.at < a.at || b.at === a.at && JSON.stringify(b) < JSON.stringify(a) ? b : a;
const withoutRevoked = (owned, fines) => {
	const out = { ...owned };
	Object.values(fines).forEach((f) => Object.entries(f.items).forEach(([id, t]) => {
		if (out[id] && out[id] <= t) delete out[id];
	}));
	return out;
};
const RENAMED = { goldbar: "balloon" };
const renamed = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [RENAMED[k] || k, v]));
function normalizeProgram(r) {
	const e = emptyLearn();
	const p = obj(r.profile);
	const pl = obj(r.placement);
	const w = obj(r.wear);
	const fines = finesMap(r.fines);
	const owned = withoutRevoked(renamed(tsMap$1(r.owned, 500)), fines);
	const revokedIds = new Set(Object.values(fines).flatMap((f) => Object.keys(f.items)));
	const topics = {};
	Object.keys(obj(r.topics)).filter(okKey$1).slice(0, MAX_KEYS$1).forEach((k) => {
		const t = obj(r.topics[k]);
		const n = cnt(t.n, TOPIC_WINDOW);
		if (n) topics[k] = {
			n,
			ok: Math.min(n, Math.round(Math.max(0, fin$1(t.ok)) * 100) / 100)
		};
	});
	const daily = {};
	Object.keys(obj(r.daily)).filter(isDay).sort().slice(-60).forEach((k) => {
		const d = obj(r.daily[k]);
		const out = {};
		DAILY_FIELDS.forEach((f) => {
			out[f] = cnt(d[f], f === "s" ? 86400 : f === "h" ? 3 : 1e5);
		});
		daily[k] = out;
	});
	return {
		profile: {
			goal: PROFILE_GOALS.includes(p.goal) ? p.goal : e.profile.goal,
			minutes: PROFILE_MINUTES.includes(p.minutes) ? p.minutes : e.profile.minutes,
			knows: p.knows === true,
			at: cnt(p.at, 0x5af3107a4000),
			...isDay(p.since) && PROFILE_MINUTES.includes(p.prev) ? {
				since: p.since,
				prev: p.prev
			} : {}
		},
		placement: {
			at: cnt(pl.at, 0x5af3107a4000),
			opened: (Array.isArray(pl.opened) ? pl.opened : []).filter(okKey$1).slice(0, 40)
		},
		run: {
			n: cnt(obj(r.run).n, 1e7),
			at: cnt(obj(r.run).at, 0x5af3107a4000),
			...cnt(obj(r.run).z, 0x5af3107a4000) ? { z: cnt(obj(r.run).z, 0x5af3107a4000) } : {}
		},
		topics,
		daily,
		recent: typeof r.recent === "string" && /^[01]*$/.test(r.recent) ? r.recent.slice(-30) : "",
		recentAt: cnt(r.recentAt, 0x5af3107a4000),
		coins: dayMap(r.coins, 1e6),
		spent: dayMap(r.spent, 1e6),
		freezeBuy: dayMap(r.freezeBuy, 10),
		frozen: Object.fromEntries(Object.keys(obj(r.frozen)).filter(isDay).sort().slice(-400).map((k) => [k, 1])),
		policyAt: cnt(r.policyAt, 0x5af3107a4000),
		policyOff: cnt(r.policyOff, 0x5af3107a4000),
		policyLapse: cnt(r.policyLapse, 0x5af3107a4000),
		premiums: dayMap(r.premiums, 80),
		monthPlan: monthPlanMap(r.monthPlan),
		claimed: claimedMap(r.claimed),
		owned,
		skipped: tsMap$1(r.skipped, 60),
		fines,
		wear: {
			...Object.fromEntries(SLOTS.map((sl) => [sl, okKey$1(w[sl]) && !(revokedIds.has(RENAMED[w[sl]] || w[sl]) && !owned[RENAMED[w[sl]] || w[sl]]) ? RENAMED[w[sl]] || w[sl] : null])),
			at: cnt(w.at, 0x5af3107a4000)
		},
		seen: countMap(r.seen, MAX_SEEN, 9999),
		best: countMap(r.best, MAX_BEST, 1e6),
		boost: cnt(r.boost, 0x5af3107a4000),
		piggy: piggyMap(r.piggy),
		piggyOut: piggyMap(r.piggyOut),
		piggyTop: piggyTopMap(r.piggyTop),
		piggyAdd: piggyAddMap(r.piggyAdd),
		garden: gardenMap(r.garden),
		harvest: harvestMap(r.harvest),
		water: waterMap(r.water),
		read: tsMap$1(r.read, 200),
		readGem: tsMap$1(r.readGem, 200),
		gems: tsMap$1(r.gems, 300),
		met: tsMap$1(r.met, 200),
		fixed: tsMap$1(r.fixed, 200),
		books: tsMap$1(r.books, 100),
		graphs: tsMap$1(r.graphs, 100),
		draws: tsMap$1(r.draws, 100),
		shown: Object.fromEntries(Object.entries(tsMap$1(r.shown, 5e3)).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).slice(-600))
	};
}
function mergeProgram(x, y) {
	const maxMap = (p, q) => {
		const out = { ...p };
		Object.entries(q).forEach(([k, v]) => {
			out[k] = Math.max(out[k] || 0, v);
		});
		return out;
	};
	const minTs = (p, q) => {
		const out = { ...p };
		Object.entries(q).forEach(([k, v]) => {
			out[k] = out[k] ? Math.min(out[k], v) : v;
		});
		return out;
	};
	const later = (a, b) => b.at > a.at || b.at === a.at && JSON.stringify(b) > JSON.stringify(a) ? b : a;
	const topics = { ...x.topics };
	Object.entries(y.topics).forEach(([k, t]) => {
		const c = topics[k];
		topics[k] = !c || t.n > c.n || t.n === c.n && t.ok > c.ok ? t : c;
	});
	const daily = { ...x.daily };
	Object.entries(y.daily).forEach(([k, d]) => {
		const c = daily[k];
		daily[k] = c ? Object.fromEntries(DAILY_FIELDS.map((f) => [f, f === "h" ? c.h | d.h : Math.max(c[f], d[f])])) : d;
	});
	const run = mergeRun(x.run, y.run, later);
	if (run.at) {
		const k = dayOf(run.at);
		if (daily[k] && daily[k].rc > run.n) daily[k] = {
			...daily[k],
			rc: run.n
		};
	}
	const laterRecent = y.recentAt > x.recentAt || y.recentAt === x.recentAt && y.recent > x.recent;
	return {
		profile: later(x.profile, y.profile),
		placement: later(x.placement, y.placement),
		wear: later(x.wear, y.wear),
		run,
		topics,
		daily,
		recent: laterRecent ? y.recent : x.recent,
		recentAt: Math.max(x.recentAt, y.recentAt),
		coins: maxMap(x.coins, y.coins),
		spent: maxMap(x.spent, y.spent),
		freezeBuy: maxMap(x.freezeBuy, y.freezeBuy),
		frozen: {
			...x.frozen,
			...y.frozen
		},
		claimed: minTs(x.claimed, y.claimed),
		owned: minTs(x.owned, y.owned),
		skipped: minTs(x.skipped, y.skipped),
		fines: Object.fromEntries([.../* @__PURE__ */ new Set([...Object.keys(x.fines), ...Object.keys(y.fines)])].map((k) => [k, earlierFine(x.fines[k], y.fines[k])])),
		policyAt: Math.max(x.policyAt, y.policyAt),
		policyOff: Math.max(x.policyOff, y.policyOff),
		policyLapse: Math.max(x.policyLapse, y.policyLapse),
		premiums: maxMap(x.premiums, y.premiums),
		monthPlan: mergeMonthPlan(x.monthPlan, y.monthPlan),
		seen: maxMap(x.seen, y.seen),
		best: maxMap(x.best, y.best),
		boost: Math.max(x.boost, y.boost),
		piggy: maxMap(x.piggy, y.piggy),
		piggyOut: maxMap(x.piggyOut, y.piggyOut),
		piggyTop: {
			...x.piggyTop,
			...y.piggyTop
		},
		piggyAdd: {
			...x.piggyAdd,
			...y.piggyAdd
		},
		garden: Object.fromEntries([.../* @__PURE__ */ new Set([...Object.keys(x.garden), ...Object.keys(y.garden)])].map((k) => [k, [x.garden[k], y.garden[k]].filter(Boolean).sort()[0]])),
		harvest: minTs(x.harvest, y.harvest),
		water: Object.fromEntries([.../* @__PURE__ */ new Set([...Object.keys(x.water), ...Object.keys(y.water)])].map((k) => [k, [x.water[k], y.water[k]].filter(Boolean).sort()[0]])),
		shown: minTs(x.shown, y.shown),
		read: minTs(x.read, y.read),
		readGem: minTs(x.readGem, y.readGem),
		gems: minTs(x.gems, y.gems),
		met: minTs(x.met, y.met),
		fixed: minTs(x.fixed, y.fixed),
		books: minTs(x.books, y.books),
		graphs: minTs(x.graphs, y.graphs),
		draws: minTs(x.draws, y.draws)
	};
}
function mergeLearn(a, b) {
	const x = normalizeLearn(a);
	const y = normalizeLearn(b);
	const maxMap = (p, q) => {
		const out = { ...p };
		Object.entries(q).forEach(([k, v]) => {
			out[k] = Math.max(out[k] || 0, v);
		});
		return out;
	};
	const lessons = { ...x.lessons };
	Object.entries(y.lessons).forEach(([k, l]) => {
		const c = lessons[k];
		const gem = Math.min(c && c.diamond ? c.diamond : Infinity, l.diamond || Infinity);
		lessons[k] = c ? {
			at: Math.min(c.at || l.at, l.at || c.at),
			runs: Math.max(c.runs, l.runs),
			best: Math.max(c.best, l.best),
			...gem < Infinity ? { diamond: gem } : {},
			...c.held && l.held ? { held: 1 } : {}
		} : l;
	});
	const units = { ...x.units };
	Object.entries(y.units).forEach(([k, u]) => {
		const c = units[k] || {};
		const ace = Math.max(c.ace || 0, u.ace || 0);
		units[k] = {
			tested: Math.max(c.tested || 0, u.tested),
			...ace ? { ace } : {}
		};
	});
	const levels = { ...x.levels };
	const early = (a, b) => a && b ? Math.min(a, b) : a || b || 0;
	Object.entries(y.levels || {}).forEach(([k, v]) => {
		const c = levels[k];
		const ok = c ? early(c.ok, v.ok) : v.ok || 0;
		levels[k] = c ? {
			at: early(c.at, v.at),
			best: Math.max(c.best, v.best),
			...ok ? { ok } : {}
		} : v;
	});
	const types = { ...x.types };
	Object.entries(y.types).forEach(([k, t]) => {
		const c = types[k] || {
			n: 0,
			ok: 0,
			ms: 0
		};
		types[k] = {
			n: Math.max(c.n, t.n),
			ok: Math.max(c.ok, t.ok),
			ms: Math.max(c.ms, t.ms)
		};
	});
	const byId = {};
	[...x.mistakes, ...y.mistakes].forEach((m) => {
		byId[m.id] = Math.max(byId[m.id] || 0, m.at);
	});
	const hintById = {};
	[...x.hinted, ...y.hinted].forEach((m) => {
		hintById[m.id] = Math.max(hintById[m.id] || 0, m.at);
	});
	return normalizeLearn({
		lessons,
		units,
		levels,
		types,
		goal: y.goalAt > x.goalAt || y.goalAt === x.goalAt && y.goal > x.goal ? y.goal : x.goal,
		goalAt: Math.max(x.goalAt, y.goalAt),
		xp: maxMap(x.xp, y.xp),
		done: maxMap(x.done, y.done),
		runs: {
			started: Math.max(x.runs.started, y.runs.started),
			finished: Math.max(x.runs.finished, y.runs.finished),
			abandoned: Math.max(x.runs.abandoned, y.runs.abandoned)
		},
		quits: maxMap(x.quits, y.quits),
		quitAt: maxMap(x.quitAt, y.quitAt),
		mistakes: Object.entries(byId).map(([id, at]) => ({
			id,
			at
		})).sort((p, q) => p.at - q.at || (p.id < q.id ? -1 : 1)),
		hinted: Object.entries(hintById).map(([id, at]) => ({
			id,
			at
		})).sort((p, q) => p.at - q.at || (p.id < q.id ? -1 : 1)),
		solved: maxMap(x.solved, y.solved),
		unhint: maxMap(x.unhint, y.unhint),
		...mergeProgram(x, y)
	});
}
// src/textbook/progress.js
const REVIEW_DAYS = [
	2,
	5,
	12
];
const emptyProgress = () => ({
	read: {},
	unread: {},
	problems: {},
	last: null,
	lastAt: 0,
	days: {},
	learn: emptyLearn()
});
const MAX_ENTRIES = 600;
const fin = (v) => Number.isFinite(v) ? v : null;
const okKey = (k) => typeof k === "string" && k.length > 0 && k.length <= 64;
const tsMap = (v) => {
	const out = {};
	if (!v || typeof v !== "object" || Array.isArray(v)) return out;
	Object.keys(v).filter(okKey).slice(0, MAX_ENTRIES).forEach((k) => {
		if (fin(v[k]) != null && v[k] > 0) out[k] = v[k];
	});
	return out;
};
const cleanPage = (v) => {
	if (!v || typeof v !== "object" || typeof v.kind !== "string" || v.kind.length > 32) return null;
	const page = { kind: v.kind };
	if (okKey(v.id)) page.id = v.id;
	return page;
};
function normalizeTextbook(raw) {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyProgress();
	const problems = {};
	const src = raw.problems && typeof raw.problems === "object" && !Array.isArray(raw.problems) ? raw.problems : {};
	Object.keys(src).filter(okKey).slice(0, MAX_ENTRIES).forEach((id) => {
		const r = src[id];
		if (!r || typeof r !== "object") return;
		const box = Number.isInteger(r.box) && r.box >= 0 && r.box < REVIEW_DAYS.length ? r.box : null;
		const cnt = (v) => Math.max(0, Math.min(9999, Math.round(fin(v) || 0)));
		const conf = {};
		const cn = cnt(r.cn);
		const un = cnt(r.un);
		if (cn || un) Object.assign(conf, {
			cn,
			cok: Math.min(cn, cnt(r.cok)),
			un,
			uok: Math.min(un, cnt(r.uok))
		});
		problems[id] = {
			...conf,
			tries: Math.max(0, Math.min(9999, Math.round(fin(r.tries) || 0))),
			ok: !!r.ok,
			box,
			due: box == null ? null : fin(r.due),
			lastAt: Math.max(0, fin(r.lastAt) || 0)
		};
	});
	return {
		read: tsMap(raw.read),
		unread: tsMap(raw.unread),
		problems,
		last: cleanPage(raw.last),
		lastAt: Math.max(0, fin(raw.lastAt) || 0),
		days: cleanDays(raw.days),
		learn: normalizeLearn(raw.learn)
	};
}
function cleanDays(v) {
	const out = {};
	if (!v || typeof v !== "object" || Array.isArray(v)) return out;
	Object.keys(v).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-120).forEach((k) => {
		const m = Math.round(fin(v[k]) || 0);
		if (m > 0) out[k] = Math.min(1440, m);
	});
	return out;
}
function mergeTextbook(a, b) {
	const x = normalizeTextbook(a);
	const y = normalizeTextbook(b);
	const read = {};
	const unread = {};
	(/* @__PURE__ */ new Set([
		...Object.keys(x.read),
		...Object.keys(y.read),
		...Object.keys(x.unread),
		...Object.keys(y.unread)
	])).forEach((id) => {
		const readTs = [x.read[id], y.read[id]].filter(Boolean);
		const unreadAt = Math.max(x.unread[id] || 0, y.unread[id] || 0);
		if ((readTs.length ? Math.max(...readTs) : 0) > unreadAt) read[id] = Math.min(...readTs.filter((t) => t > unreadAt));
		else if (unreadAt) unread[id] = unreadAt;
	});
	const problems = { ...x.problems };
	Object.entries(y.problems).forEach(([id, r]) => {
		const cur = problems[id];
		if (!cur) {
			problems[id] = r;
			return;
		}
		const merged = {
			...r.lastAt > cur.lastAt || r.lastAt === cur.lastAt && JSON.stringify(r) > JSON.stringify(cur) ? r : cur,
			tries: Math.max(cur.tries, r.tries)
		};
		if (cur.cn || cur.un || r.cn || r.un) [
			"cn",
			"cok",
			"un",
			"uok"
		].forEach((k) => {
			merged[k] = Math.max(cur[k] || 0, r[k] || 0);
		});
		problems[id] = merged;
	});
	const pickY = y.lastAt > x.lastAt || y.lastAt === x.lastAt && !x.last && y.last;
	const days = { ...x.days };
	Object.entries(y.days).forEach(([k, m]) => {
		days[k] = Math.max(days[k] || 0, m);
	});
	return {
		read,
		unread,
		problems,
		last: pickY ? y.last : x.last,
		lastAt: Math.max(x.lastAt, y.lastAt),
		days: cleanDays(days),
		learn: mergeLearn(x.learn, y.learn)
	};
}
// api/solo.js
const SLOT_COUNT = 4;
const MAX_NAME_LEN = 40;
const MAX_PLAYER_ID_LEN = 64;
const NEWS_CAP = 40;
const PROFILE_ACTIONS = /* @__PURE__ */ new Set([
	"progress",
	"link_create",
	"link_status",
	"link_claim",
	"link_cancel",
	"link_revoke"
]);
const emptySlots = () => Array.from({ length: SLOT_COUNT }, () => null);
const normalizeSlots = (slots) => {
	const out = emptySlots();
	if (Array.isArray(slots)) slots.slice(0, SLOT_COUNT).forEach((s, i) => {
		out[i] = s || null;
	});
	return out;
};
const cleanName = (v) => {
	if (typeof v !== "string") return null;
	const t = v.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LEN);
	return t.length ? t : null;
};
const LINK_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LINK_LEN = 8;
const makeLinkCode = () => Array.from({ length: LINK_LEN }, () => LINK_ALPHABET[randomInt(31)]).join("");
const cleanCode = (v) => typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LINK_LEN) : "";
const MAX_KEYS = 300;
const cleanMap = (v) => {
	if (!v || typeof v !== "object" || Array.isArray(v)) return {};
	const out = {};
	Object.keys(v).slice(0, MAX_KEYS).forEach((k) => {
		if (typeof k === "string" && k.length <= 64) out[k] = v[k];
	});
	return out;
};
const cleanIdList = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.length <= 64).slice(0, 64) : [];
function normalizeProgress(p) {
	const src = p && typeof p === "object" ? p : {};
	const achievements = {};
	Object.entries(cleanMap(src.achievements)).forEach(([id, at]) => {
		achievements[id] = Number.isFinite(at) ? at : Date.now();
	});
	const modules = {};
	Object.entries(cleanMap(src.modules)).forEach(([id, st]) => {
		if (!st || typeof st !== "object") return;
		modules[id] = {
			step: Number.isFinite(st.step) ? Math.max(0, Math.min(999, Math.round(st.step))) : 0,
			at: Number.isFinite(st.at) ? Math.max(0, Math.min(999, Math.round(st.at))) : 0,
			passed: cleanMap(st.passed)
		};
	});
	const folds = {};
	Object.entries(cleanMap(src.folds)).forEach(([id, v]) => {
		if (Array.isArray(v) && Number.isFinite(v[1])) folds[id] = [v[0] ? 1 : 0, v[1]];
	});
	return {
		achievements,
		folds,
		roles: cleanIdList(src.roles),
		network: !!src.network,
		courses: cleanMap(src.courses),
		modules,
		textbook: normalizeTextbook(src.textbook),
		linkedAt: Number.isFinite(src.linkedAt) ? src.linkedAt : null
	};
}
function mergeProgress(a, b) {
	const x = normalizeProgress(a);
	const y = normalizeProgress(b);
	const achievements = { ...x.achievements };
	Object.entries(y.achievements).forEach(([id, at]) => {
		achievements[id] = Math.min(achievements[id] ?? at, at);
	});
	const modules = { ...x.modules };
	Object.entries(y.modules).forEach(([id, st]) => {
		const cur = modules[id];
		modules[id] = cur ? {
			step: Math.max(cur.step, st.step),
			at: Math.max(cur.at, st.at),
			passed: {
				...cur.passed,
				...st.passed
			}
		} : st;
	});
	const folds = { ...x.folds };
	Object.entries(y.folds).forEach(([id, v]) => {
		if (!folds[id] || v[1] >= folds[id][1]) folds[id] = v;
	});
	return {
		achievements,
		folds,
		roles: Array.from(/* @__PURE__ */ new Set([...x.roles, ...y.roles])).slice(0, 64),
		network: x.network || y.network,
		courses: {
			...x.courses,
			...y.courses
		},
		modules,
		textbook: mergeTextbook(x.textbook, y.textbook),
		linkedAt: Math.max(x.linkedAt || 0, y.linkedAt || 0) || null,
		updatedAt: Date.now()
	};
}
function summarize(slot) {
	if (!slot) return null;
	const snap = slot.snapshot || {};
	return {
		savedAt: slot.savedAt,
		name: slot.name || null,
		role: snap.setup && snap.setup.role,
		difficulty: snap.setup && snap.setup.difficulty,
		quarterIndex: snap.quarterIndex
	};
}
function trimSnapshot(snap) {
	const history = Array.isArray(snap.history) ? snap.history.slice(-40).map((h) => {
		const { revenueParts: _revenueParts, ...rest } = h;
		return rest;
	}) : [];
	const newsFeed = Array.isArray(snap.newsFeed) ? snap.newsFeed.slice(0, NEWS_CAP) : [];
	return {
		...snap,
		history,
		newsFeed
	};
}
const validTycoon = (snap) => snap && typeof snap === "object" && snap.mode === "tycoon" && snap.country && snap.country.economy && Array.isArray(snap.buildings);
function trimTycoon(snap) {
	return {
		...snap,
		news: Array.isArray(snap.news) ? snap.news.slice(0, 30) : [],
		history: Array.isArray(snap.history) ? snap.history.slice(-40) : [],
		country: {
			...snap.country,
			prev: void 0,
			stories: Array.isArray(snap.country.stories) ? snap.country.stories.slice(-10) : []
		}
	};
}
function summarizeTycoon(slot) {
	if (!slot) return null;
	const snap = slot.snapshot || {};
	return {
		savedAt: slot.savedAt,
		name: slot.name || null,
		start: snap.start,
		cash: snap.cash,
		buildings: Array.isArray(snap.buildings) ? snap.buildings.length : 0,
		quarterIndex: snap.country && snap.country.quarterIndex,
		legacy: snap.legacy || 0
	};
}
const slotApi = (kind) => kind === "tycoon" ? {
	get: getTycoonSlots,
	set: setTycoonSlots,
	valid: validTycoon,
	trim: trimTycoon,
	summarize: summarizeTycoon
} : {
	get: getSoloSlots,
	set: setSoloSlots,
	valid: (x) => validSnapshot(x),
	trim: (x) => trimSnapshot(x),
	summarize: (x) => summarize(x)
};
const validPlayerId = (id) => typeof id === "string" && id.length > 0 && id.length <= MAX_PLAYER_ID_LEN;
const validSlotIndex = (v) => {
	const n = Number(v);
	return Number.isInteger(n) && n >= 0 && n < SLOT_COUNT ? n : null;
};
const validSnapshot = (snap) => snap && typeof snap === "object" && snap.app === "economic-panel" && snap.setup && snap.economy && Array.isArray(snap.history);
async function handleRequest(req, res) {
	if (req.method === "GET") {
		const { playerId, slot } = req.query;
		if (!validPlayerId(playerId)) return res.status(400).json({ error: "Некорректный идентификатор" });
		const api = slotApi(req.query.kind);
		const slots = normalizeSlots(await api.get(playerId));
		if (slot !== void 0) {
			const idx = validSlotIndex(slot);
			if (idx === null) return res.status(400).json({ error: "Некорректный слот" });
			const s = slots[idx];
			if (!s) return res.status(404).json({ error: "Слот пуст" });
			return res.status(200).json({ snapshot: s.snapshot });
		}
		return res.status(200).json({
			slots: slots.map(api.summarize),
			storage: hasKv() ? "kv" : "memory"
		});
	}
	if (req.method !== "POST") return res.status(405).json({ error: "Только GET и POST" });
	let body;
	try {
		body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
	} catch {
		return res.status(400).json({ error: "Некорректный JSON" });
	}
	if (!body || typeof body !== "object") return res.status(400).json({ error: "Некорректное тело запроса" });
	const { action, playerId } = body;
	if (PROFILE_ACTIONS.has(action)) return handleProfileAction(body, res);
	if (!validPlayerId(playerId)) return res.status(400).json({ error: "Некорректный идентификатор" });
	const idx = validSlotIndex(body.slot);
	if (idx === null) return res.status(400).json({ error: "Некорректный слот" });
	const api = slotApi(body.kind);
	const summarize = api.summarize;
	const setSoloSlots = api.set;
	const slots = normalizeSlots(await api.get(playerId));
	if (action === "save") {
		if (!api.valid(body.snapshot)) return res.status(400).json({ error: "Некорректное сохранение" });
		const name = cleanName(body.name) || slots[idx] && slots[idx].name || null;
		slots[idx] = {
			savedAt: (/* @__PURE__ */ new Date()).toISOString(),
			name,
			snapshot: api.trim(body.snapshot)
		};
		await setSoloSlots(playerId, slots);
		return res.status(200).json({ slots: slots.map(summarize) });
	}
	if (action === "rename") {
		if (!slots[idx]) return res.status(404).json({ error: "Слот пуст" });
		slots[idx] = {
			...slots[idx],
			name: cleanName(body.name)
		};
		await setSoloSlots(playerId, slots);
		return res.status(200).json({ slots: slots.map(summarize) });
	}
	if (action === "delete") {
		slots[idx] = null;
		await setSoloSlots(playerId, slots);
		return res.status(200).json({ slots: slots.map(summarize) });
	}
	return res.status(400).json({ error: "Неизвестное действие" });
}
async function handleProfileAction(body, res) {
	const { action, playerId } = body;
	if (!validPlayerId(playerId)) return res.status(400).json({ error: "Некорректный идентификатор" });
	if (action === "progress") {
		const merged = mergeProgress(await getProfile(playerId), body.progress);
		await setProfile(playerId, merged);
		return res.status(200).json({
			profile: merged,
			storage: hasKv() ? "kv" : "memory"
		});
	}
	if (action === "link_create") {
		if (body.progress) await setProfile(playerId, mergeProgress(await getProfile(playerId), body.progress));
		const code = makeLinkCode();
		const link = await setLink(code, {
			playerId,
			claimed: false
		});
		return res.status(200).json({
			code,
			expiresAt: link.expiresAt,
			storage: hasKv() ? "kv" : "memory"
		});
	}
	if (action === "link_status") {
		const code = cleanCode(body.code);
		const link = code ? await getLink(code) : null;
		if (!link) return res.status(200).json({
			claimed: false,
			expired: true
		});
		if (link.playerId !== playerId) return res.status(403).json({ error: "Код принадлежит другому устройству" });
		return res.status(200).json({
			claimed: !!link.claimed,
			expiresAt: link.expiresAt
		});
	}
	if (action === "link_claim") {
		const code = cleanCode(body.code);
		if (code.length !== LINK_LEN) return res.status(400).json({ error: "Код состоит из восьми знаков" });
		const link = await getLink(code);
		if (!link) return res.status(404).json({ error: "Код не найден или устарел — попросите показать новый" });
		if (link.claimed) return res.status(409).json({ error: "Этот код уже использован" });
		if (link.playerId === playerId) return res.status(400).json({ error: "Это то же самое устройство" });
		const merged = {
			...mergeProgress(await getProfile(link.playerId), body.progress),
			linkedAt: Date.now()
		};
		await setProfile(link.playerId, merged);
		await setLink(code, {
			playerId: link.playerId,
			claimed: true
		}, 60);
		const slots = normalizeSlots(await getSoloSlots(link.playerId));
		return res.status(200).json({
			playerId: link.playerId,
			profile: merged,
			slots: slots.map(summarize),
			storage: hasKv() ? "kv" : "memory"
		});
	}
	if (action === "link_revoke") {
		const profile = await getProfile(playerId);
		const slots = normalizeSlots(await getSoloSlots(playerId));
		const fresh = randomUUID();
		await setProfile(fresh, {
			...mergeProgress(profile, body.progress),
			linkedAt: null
		});
		await setSoloSlots(fresh, slots);
		await setTycoonSlots(fresh, normalizeSlots(await getTycoonSlots(playerId)));
		return res.status(200).json({
			playerId: fresh,
			profile: await getProfile(fresh),
			slots: slots.map(summarize),
			storage: hasKv() ? "kv" : "memory"
		});
	}
	if (action === "link_cancel") {
		const code = cleanCode(body.code);
		const link = code ? await getLink(code) : null;
		if (link && link.playerId === playerId && !link.claimed) await delLink(code);
		return res.status(200).json({ ok: true });
	}
	return null;
}
async function handler(req, res) {
	try {
		return await handleRequest(req, res);
	} catch (err) {
		console.error("solo handler error:", err);
		return res.status(500).json({ error: "Внутренняя ошибка сервера" });
	}
}
// server/onreza.mjs
const HANDLERS = {
	account: handler$5,
	daily: handler$4,
	events: handler$3,
	records: handler$2,
	reports: handler$6,
	research: research_default,
	room: handler$1,
	solo: handler
};
const BODY_LIMIT = 4718592;
function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (c) => {
			size += c.length;
			if (size > 4718592) {
				reject(Object.assign(/* @__PURE__ */ new Error("too big"), { code: 413 }));
				req.destroy();
			} else chunks.push(c);
		});
		req.on("end", () => {
			const raw = Buffer.concat(chunks).toString("utf8");
			if (!raw) return resolve(void 0);
			if (String(req.headers["content-type"] || "").includes("application/json")) try {
				return resolve(JSON.parse(raw));
			} catch {
				return resolve(raw);
			}
			return resolve(raw);
		});
		req.on("error", reject);
	});
}
function vercelRes(res) {
	res.status = (code) => {
		res.statusCode = code;
		return res;
	};
	res.json = (data) => {
		if (!res.headersSent) {
			res.setHeader("Content-Type", "application/json; charset=utf-8");
			res.setHeader("Cache-Control", "no-store");
		}
		res.end(JSON.stringify(data));
		return res;
	};
	return res;
}
function createApi(handlers = HANDLERS) {
	return http.createServer(async (req, res) => {
		vercelRes(res);
		const url = new URL(req.url, "http://local");
		const m = /^\/api\/([a-z]+)\/?$/.exec(url.pathname);
		const handler = m && Object.hasOwn(handlers, m[1]) ? handlers[m[1]] : null;
		if (!handler) return res.status(404).json({ error: "Не найдено" });
		req.query = Object.fromEntries(url.searchParams);
		try {
			req.body = ["GET", "HEAD"].includes(req.method) ? void 0 : await readBody(req);
		} catch (e) {
			return res.status(e.code === 413 ? 413 : 400).json({ error: e.code === 413 ? "Слишком большой запрос" : "Некорректный запрос" });
		}
		try {
			await handler(req, res);
			if (!res.writableEnded) res.status(500).json({ error: "Пустой ответ" });
		} catch (e) {
			console.error(`api/${m[1]}`, e);
			if (!res.writableEnded) res.status(500).json({ error: "Внутренняя ошибка сервера" });
		}
	});
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const port = Number.parseInt(process.env.PORT || "3000", 10);
	createApi().listen(port, "0.0.0.0", () => console.log(`api: 0.0.0.0:${port}`));
}
export { BODY_LIMIT, HANDLERS, createApi };
