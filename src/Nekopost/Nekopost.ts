import {
    SourceManga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    PagedResults,
    SourceInfo,
    ContentRating,
    BadgeColor,
    Request,
    Response,
    TagSection,
    SourceIntents,
    ChapterProviding,
    MangaProviding,
    SearchResultsProviding,
    Tag,
    HomePageSectionsProviding
} from '@paperback/types'

import {
    parseChapterDetails,
    parseChapters,
    parseHomeSections,
    parseMangaDetails,
    parseViewMore,
    parseSearch,
} from './NekopostParser'

import {
    MangaDetails,
    HomeData,
    ChapterImage,
    SearchData,
} from './NekopostHelper'

const BASE_URL = 'https://www.nekopost.net'

export const NekopostInfo: SourceInfo = {
    version: '1.0.6',
    name: 'Nekopost',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls mangas from Nekopost.net',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: BASE_URL,
    sourceTags: [],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS
}

export class Nekopost implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {

                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': BASE_URL,
                    },

                }

                return request
            },

            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            },
        }
    });

    getMangaShareUrl(mangaId: string): string { return `${BASE_URL}/manga/${mangaId}` }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/`,
            method: 'GET',
            param: mangaId,
        })
        const response = await this.requestManager.schedule(request, 1)

        let data: MangaDetails
        try {
            data = JSON.parse(response.data as string)
        } catch (e) {
            throw new Error(`${e}`)
        }

        return parseMangaDetails(data, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/`,
            method: 'GET',
            param: mangaId,
        })

        const response = await this.requestManager.schedule(request, 1)

        let data: MangaDetails
        try {
            data = JSON.parse(response.data as string)
        } catch (e) {
            throw new Error(`${e}`)
        }
        return parseChapters(data, mangaId)
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: `https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${mangaId}_${chapterId}.json`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)

        let data: ChapterImage
        try {
            data = JSON.parse(response.data as string)
        } catch (e) {
            throw new Error(`${e}`)
        }
        return parseChapterDetails(data, mangaId, chapterId)
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: 'https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/0',
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)

        let data: HomeData
        
        try {
            data = JSON.parse(response.data as string)
        } catch (e) {
            throw new Error(`${e}`)
        }

        parseHomeSections(data, sectionCallback)
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        if (metadata?.completed) return metadata

        const page: number = metadata?.page ?? 0
        let param;
        switch (homepageSectionId) {
            case 'latest_comic':
                param = `${page}`
                break
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist')
        }

        const request = App.createRequest({
            url: `https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/${param}`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)

        let data: HomeData
        try {
            data = JSON.parse(response.data as string)
        } catch (e) {
            throw new Error(`${e}`)
        }

        const manga = parseViewMore(data)

        metadata = page + 1
        return App.createPagedResults({
            results: manga,
            metadata
        })
    }

    async getSearchResults(query: SearchRequest, metadata: unknown): Promise<PagedResults> {
        let request

        if (query.title) {
            request = App.createRequest({
                url: 'https://api.osemocphoto.com/frontAPI/getProjectSearch',
                method: 'POST',
                data: JSON.stringify({
                    ipKeyword: `${(query?.title || '')}`,
                }),
            });
        }
        else if (query.title && query.includedTags){
            request = App.createRequest({
                url: 'https://api.osemocphoto.com/frontAPI/getProjectSearch',
                method: 'POST',
                data: JSON.stringify({
                    ipCate: `${query?.includedTags?.map((x: any) => x.id)[0]}`,
                    ipKeyword: `${(query?.title || '')}`,
                }),
            });
        }
        else {
            request = App.createRequest({
                url: `https://api.osemocphoto.com/frontAPI/getProjectExplore/${query?.includedTags?.map((x: any) => x.id)[0]}/n/1/S/`,
                method: 'POST',
            });
        }

        const response = await this.requestManager.schedule(request, 1)
        let data: SearchData
        try {
            data = JSON.parse(response.data as string)
        } catch (e) {
            throw new Error(`${e}`)
        }

        const manga = parseSearch(data)
        return App.createPagedResults({
            results: manga
        })
    }

    async getSearchTags(): Promise<TagSection[]> {
        const arrayTags: Tag[] = []
        const TagList = JSON.parse(
            '{"List":[{"id":"1","label":"Fantasy"},{"id":"2","label":"Action"},{"id":"3","label":"Drama"},{"id":"5","label":"Sport"},{"id":"7","label":"Sci-fi"},{"id":"8","label":"Comedy"},{"id":"9","label":"Slice of Life"},{"id":"10","label":"Romance"},{"id":"13","label":"Adventure"},{"id":"23","label":"Yaoi"},{"id":"49","label":"Seinen"},{"id":"25","label":"Trap"},{"id":"26","label":"Gender Blender"},{"id":"45","label":"Second Life"},{"id":"44","label":"Isekai"},{"id":"43","label":"School Life"},{"id":"32","label":"Mystery"},{"id":"48","label":"One Shot"},{"id":"47","label":"Horror"},{"id":"37","label":"Doujinshi"},{"id":"46","label":"Shounen"},{"id":"42","label":"Shoujo"},{"id":"24","label":"Yuri"},{"id":"41","label":"Gourmet"},{"id":"50","label":"Harem"},{"id":"51","label":"Reincanate"}]}'
            );
        for (const tag of TagList.List) {
            const id = tag.id ?? ''
            const label = tag.label ?? ''
            if (!id || !label) continue
            arrayTags.push({ id: id, label: label })
        }
        const tagSections: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => App.createTag(x)) })]
        return tagSections
    }
}