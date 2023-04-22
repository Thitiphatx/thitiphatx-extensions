import {
    Source,
    Manga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    PagedResults,
    SourceInfo,
    ContentRating,
    MangaUpdates,
    TagType,
    Tag,
    TagSection,
    Request,
    Response,
} from 'paperback-extensions-common'

import {
    parseChapterDetails,
    parseChapters,
    parseHomeSections,
    parseMangaDetails,
    parseViewMore,
    parseSearch,
    parseUpdatedManga,
    UpdatedManga,
} from './NekopostParser'

import {
    MangaDetails,
    HomeData,
    ChapterImage,
    SearchData,
} from './NekopostHelper'

const NP_DOMAIN = 'https://www.nekopost.net'

export const NekopostInfo: SourceInfo = {
    version: '1.0.5',
    name: 'Nekopost',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from Nekopost.net',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: NP_DOMAIN,
    sourceTags: [
        {
            text: 'Recommend',
            type: TagType.GREEN,
        },
    ],
}

export class Nekopost extends Source {
    requestManager = createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {

                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': NP_DOMAIN,
                    },

                }

                return request
            },

            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            },
        },
    })


    override getMangaShareUrl(mangaId: string): string { return `${NP_DOMAIN}/manga/${mangaId}` }

    override async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/`,
            method: 'GET',
            param: mangaId,
        })
        const response = await this.requestManager.schedule(request, 1)

        let data: MangaDetails
        try {
            data = JSON.parse(response.data)
        } catch (e) {
            throw new Error(`${e}`)
        }

        return parseMangaDetails(data, mangaId)
    }

    override async getChapters(mangaId: string): Promise<Chapter[]> {
        
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/`,
            method: 'GET',
            param: mangaId,
        })
        const response = await this.requestManager.schedule(request, 1)

        let data: MangaDetails
        try {
            data = JSON.parse(response.data)
        } catch (e) {
            throw new Error(`${e}`)
        }

        return parseChapters(data, mangaId)
    }

    override async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = createRequestObject({
            url: `https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${mangaId}_${chapterId}.json`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)

        let data: ChapterImage
        try {
            data = JSON.parse(response.data)
        } catch (e) {
            throw new Error(`${e}`)
        }

        return parseChapterDetails(data, mangaId, chapterId)
    }

    override async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        let page = 0
        let updatedManga: UpdatedManga = {
            ids: [],
            loadMore: true,
        }

        while (updatedManga.loadMore) {
            const request = createRequestObject({
                url: `https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/${page}`,
                method: 'GET',
            })

            page++
            const response = await this.requestManager.schedule(request, 1)

            let data: HomeData
            try {
                data = JSON.parse(response.data)
            } catch (e) {
                throw new Error(`${e}`)
            }

            updatedManga = parseUpdatedManga(data, time, ids)
            if (updatedManga.ids.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.ids,
                }))
            }
        }

    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = createRequestObject({
            url: 'https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/0',
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, 1)

        let data: HomeData
        
        try {
            data = JSON.parse(response.data)
        } catch (e) {
            throw new Error(`${e}`)
        }

        parseHomeSections(data, sectionCallback)
        
    }
    override async getViewMoreItems(homepageSectionId: string, metadata: { page?: number }): Promise<PagedResults> {
        const page: number = metadata?.page ?? 0
        let param = ''
        switch (homepageSectionId) {
            case 'latest_comic':
                param = `${page}`
                break
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist')
        }
    
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/`,
            method: 'GET',
            param,
        })
    
        const response = await this.requestManager.schedule(request, 1)

        let data: HomeData
        try {
            data = JSON.parse(response.data)
        } catch (e) {
            throw new Error(`${e}`)
        }
    
        const manga = parseViewMore(data)
        metadata = data ? { page: page + 12 } : {}
        return createPagedResults({
            results: manga,
            metadata,
        })
    }

    override async getSearchResults(query: SearchRequest): Promise<PagedResults> {
        if (query.title) {
            const request = createRequestObject({
                url: 'https://api.osemocphoto.com/frontAPI/getProjectSearch',
                method: 'POST',
                data: JSON.stringify({
                    ipKeyword: `${(query.title ?? '')}`,
                }),
            });
    
            const response = await this.requestManager.schedule(request, 1)
            let data: SearchData
            try {
                data = JSON.parse(response.data)
            } catch (e) {
                throw new Error(`${e}`)
            }
    
            const manga = parseSearch(data)
    
            return createPagedResults({
                results: manga,
            })
        }
        else {
            const request = createRequestObject({
                url: `https://api.osemocphoto.com/frontAPI/getProjectExplore/${query?.includedTags?.map((x: any) => x.id)[0]}/n/1/S/`,
                method: 'POST',
            });
    
            const response = await this.requestManager.schedule(request, 1)
            let data: SearchData
            try {
                data = JSON.parse(response.data)
            } catch (e) {
                throw new Error(`${e}`)
            }
    
            const manga = parseSearch(data)
    
            return createPagedResults({
                results: manga,
            })
        }


    }

    override async getTags(): Promise<TagSection[]> {
        const arrayTags: Tag[] = []
        const TagList = JSON.parse('{"List":[{"id":"1","label":"Fantasy"},{"id":"2","label":"Action"},{"id":"3","label":"Drama"},{"id":"5","label":"Sport"},{"id":"7","label":"Sci-fi"},{"id":"8","label":"Comedy"},{"id":"9","label":"Slice of Life"},{"id":"10","label":"Romance"},{"id":"13","label":"Adventure"},{"id":"23","label":"Yaoi"},{"id":"49","label":"Seinen"},{"id":"25","label":"Trap"},{"id":"26","label":"Gender Blender"},{"id":"45","label":"Second Life"},{"id":"44","label":"Isekai"},{"id":"43","label":"School Life"},{"id":"32","label":"Mystery"},{"id":"48","label":"One Shot"},{"id":"47","label":"Horror"},{"id":"37","label":"Doujinshi"},{"id":"46","label":"Shounen"},{"id":"42","label":"Shoujo"},{"id":"24","label":"Yuri"},{"id":"41","label":"Gourmet"},{"id":"50","label":"Harem"},{"id":"51","label":"Reincanate"}]}');
        for (const tag of TagList.List) {
            const id = tag.id ?? ''
            const label = tag.label ?? ''
            if (!id || !label) continue
            arrayTags.push({ id: id, label: label })
        }
        const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]

        return tagSections || []
    }
}