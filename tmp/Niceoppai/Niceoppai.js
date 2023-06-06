"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Niceoppai = exports.NiceoppaiInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const NiceoppaiParser_1 = require("./NiceoppaiParser");
const NO_DOMAIN = 'https://www.niceoppai.net';
const userAgent = 'Mozilla / 5.0 (compatible; MSIE 7.0; Windows; U; Windows NT 6.0; Win64; x64 Trident / 4.0)';
exports.NiceoppaiInfo = {
    version: '1.1.0',
    name: 'Niceoppai',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from Niceoppai.net.',
    contentRating: paperback_extensions_common_1.ContentRating.MATURE,
    websiteBaseURL: NO_DOMAIN,
    sourceTags: [
        {
            text: 'Recommend',
            type: paperback_extensions_common_1.TagType.GREEN,
        },
    ],
};
class Niceoppai extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = createRequestManager({
            requestsPerSecond: 3,
            requestTimeout: 15000,
            interceptor: {
                interceptRequest: async (request) => {
                    request.headers = {
                        ...(request.headers ?? {}),
                        ...{
                            'user-agent': userAgent,
                            'referer': NO_DOMAIN,
                        },
                    };
                    return request;
                },
                interceptResponse: async (response) => {
                    return response;
                },
            },
        });
    }
    getMangaShareUrl(mangaId) { return `${NO_DOMAIN}/${mangaId}`; }
    async getMangaDetails(mangaId) {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/`,
            method: 'GET',
            param: mangaId,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseMangaDetails)($, mangaId);
    }
    async getChapters(mangaId) {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/`,
            method: 'GET',
            param: mangaId,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseChapters)($, mangaId);
    }
    async getChapterDetails(mangaId, chapterId) {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/${mangaId}/${chapterId}`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseChapterDetails)($, mangaId, chapterId);
    }
    async filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        let page = 1;
        let updatedManga = {
            ids: [],
            loadMore: true,
        };
        while (updatedManga.loadMore) {
            const request = createRequestObject({
                url: `${NO_DOMAIN}/latest-chapters/${page}`,
                method: 'GET',
            });
            page++;
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            updatedManga = (0, NiceoppaiParser_1.parseUpdatedManga)($, time, ids);
            if (updatedManga.ids.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.ids,
                }));
            }
        }
    }
    async getHomePageSections(sectionCallback) {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/latest-chapters/1`,
            method: 'GET',
            incognito: true,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseHomeSections)($, sectionCallback);
    }
    async getViewMoreItems(homepageSectionId, metadata) {
        const page = metadata?.page ?? 1;
        let param = '';
        switch (homepageSectionId) {
            case 'latest_comic':
                param = `${page}`;
                break;
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist');
        }
        const request = createRequestObject({
            url: `${NO_DOMAIN}/latest-chapters/`,
            method: 'GET',
            param,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const manga = (0, NiceoppaiParser_1.parseViewMore)($);
        metadata = !(0, NiceoppaiParser_1.isLastPage)($) ? { page: page + 1 } : {};
        return createPagedResults({
            results: manga,
            metadata,
        });
    }
    async getSearchResults(query) {
        let param;
        if (query.title) {
            param = `search/${encodeURI(query.title ?? '')}`;
        }
        else {
            param = `category/${encodeURI(query?.includedTags?.map((x) => x.id)[0])}/`;
        }
        const request = createRequestObject({
            url: `${NO_DOMAIN}/manga_list/`,
            method: 'GET',
            param,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const manga = (0, NiceoppaiParser_1.parseSearch)($);
        return createPagedResults({
            results: manga,
        });
    }
    async getTags() {
        const request = createRequestObject({
            url: NO_DOMAIN,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseTags)($) || [];
    }
}
exports.Niceoppai = Niceoppai;
