import {
    Chapter,
    ChapterDetails,
    HomeSection,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    Tag,
    TagSection,
} from 'paperback-extensions-common'

import entities = require('entities')

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): Manga => {

    const titles: string[] = []
    const title: string = $('div.wrap > div > div.site-content > div > div.profile-manga.summary-layout-1 > div > div > div > div.post-title > h1').text()
    titles.push(title)
    
    let image: string = encodeURI($('div.wrap > div > div.site-content > div > div.profile-manga.summary-layout-1 > div > div > div > div.tab-summary > div.summary_image > a > img').attr('src')) ?? 'https://i.imgur.com/GYUxEX8.png'

    const author: string = $('div.wrap > div > div.site-content > div > div.profile-manga.summary-layout-1 > div > div > div > div.tab-summary > div.summary_content_wrap > div > div.post-content > div:nth-child(4) > div.summary-content > div > a').text().trim()
    const artist: string = $('div.wrap > div > div.site-content > div > div.profile-manga.summary-layout-1 > div > div > div > div.tab-summary > div.summary_content_wrap > div > div.post-content > div:nth-child(5) > div.summary-content > div > a').text().trim()
    const rawStatus: string = $('div.wrap > div > div.site-content > div > div.profile-manga.summary-layout-1 > div > div > div > div.tab-summary > div.summary_content_wrap > div > div.post-status > div.post-content_item > div.summary-content').text().trim()
    let hentai = true
    let status = MangaStatus.COMPLETED
    if (rawStatus.includes("OnGoing")) status = MangaStatus.ONGOING

    const arrayTags: Tag[] = []
    for (const tag of $('a', 'div.wrap > div.body-wrap > div.site-content > div > div.profile-manga.summary-layout-1 > div.container > div.row > div.col-12.col-sm-12.col-md-12 > div.tab-summary > div.summary_content_wrap > div.summary_content > div.post-content > div.post-content_item > div.summary-content > div.genres-content').toArray()) {
        const label: string = $(tag).text().trim()
        const id: string = $(tag).attr('href').split('/')[4] ?? label

        if (!label) continue
        arrayTags.push({ id: id, label: label })
    }
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]

    return createManga({
        id: mangaId,
        titles,
        author,
        artist,
        image,
        hentai,
        status,
        tags: tagSections,
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    let i = 0

    for (const chapter of $('li','div.wrap > div > div.site-content > div > div.c-page-content.style-1 > div > div > div > div.main-col.col-md-8.col-sm-8 > div > div.c-page > div > div.page-content-listing.single-page > div > ul').toArray()) {
        i++
        const title: string = $('a',chapter).text().trim() ?? ""
        const chapterId: string = $('a', chapter).attr("href").split("/")[5] ?? ""

        if (!chapterId) continue

        const chapNum = parseChapterNumber(title)
        const time = $('span > i', chapter).text().trim()
        const date: Date = new Date(Date.parse(time))

        if (!chapterId || !title) continue

        chapters.push({
            id: chapterId,
            mangaId: mangaId,
            name: title,
            langCode: LanguageCode.THAI,
            chapNum: isNaN(chapNum) ? i : chapNum,
            time: date,
        })

        i--

    }
    return chapters.map(chapter => {
        return createChapter(chapter)
    })
}

const parseChapterNumber = (title: string): number => {
    if (title.includes("ตอนที่")) {
        return Number(title.split("ตอนที่ ")[1])
    } else if (title.includes(" - ")) {
        return Number(title.split(" - ")[1])
    } else {
        return 1
    }
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []
    
    for (const images of $('img','div.wrap > div > div.site-content > div > div > div > div > div > div > div.c-blog-post > div.entry-content > div > div > div > div').toArray()) {
        let image: string | undefined = $(images).attr("src")
        if (image && image.startsWith('/')) image = 'https:' + image
        if (image) pages.push(encodeURI(image).replace("%0A", ""))
    }

    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages,
        longStrip: true,
    })
    return chapterDetails
}

export interface UpdatedManga {
    ids: string[],
    loadMore: boolean;
}

export const parseUpdatedManga = ($: CheerioStatic, time: Date, ids: string[]): UpdatedManga => {
    const updatedManga: string[] = []
    let loadMore = true

    for (const manga of $('div.utao.styletwo > div.uta', '#content > div.wrapper > div.postbody > div.bixbox > div.listupd').toArray()) {
        const id: string = $('div.luf > a.series', manga).attr('href').split('/')[4] ?? ''
        const date: string = $('div.luf > ul > li:nth-child(1) > span', manga).text() ?? ''

        let mangaDate = parseDateTime(date)

        if (!id || !mangaDate) continue
        if (mangaDate > time) {
            if (ids.includes(id)) {
                updatedManga.push(id)
            }
        } else {
            loadMore = false
        }
    }
    return {
        ids: updatedManga,
        loadMore,
    }
}

export const parseHomeSections = ($: CheerioStatic, sectionCallback: (section: HomeSection) => void): void => {
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Manga', view_more: true })

    // Latest Section
    const latestSection_Array: MangaTile[] = []
    for (const row of $('#loop-content > div.page-listing-item > div.row.row-eq-height').toArray()) {
        for (const col of $('div.col-6.col-md-2.badge-pos-1 > div.page-item-detail', row).toArray()) {
            const data = $("div.item-thumb > a", col)

            const id: string = $(data).attr("href").split("/")[4] ?? ""
            const title: string = $(data).attr("title") ?? ""
            const image: string = $('img',data).attr("src") ?? ""
            const latest_num: number = parseChapterNumber($('div.item-summary > div.list-chapter > div:nth-child(1) > span.chapter.font-meta > a', col).text())
            const subtitle: string = `Chapter ${latest_num}`
            if (!id || !title) continue

            latestSection_Array.push(createMangaTile({
                id: id,
                image: encodeURI(image),
                title: createIconText({ text: decodeHTMLEntity(title) }),
                subtitleText: createIconText({ text: subtitle }),
            }))
        }
    }

    latestSection.items = latestSection_Array
    sectionCallback(latestSection)

}


export const parseViewMore = ($: CheerioStatic): MangaTile[] => {
    const comics: MangaTile[] = []
    const collectedIds: string[] = []

    for (const row of $('#loop-content > div.page-listing-item > div.row.row-eq-height').toArray()) {
        for (const col of $('div.col-6.col-md-2.badge-pos-1 > div.page-item-detail', row).toArray()) {
            const data = $("div.item-thumb > a", col)

            const id: string = $(data).attr("href").split("/")[4] ?? ""
            const title: string = $(data).attr("title") ?? ""
            const image: string = $('img',data).attr("src") ?? ""
            const latest_num: number = parseChapterNumber($('div.item-summary > div.list-chapter > div:nth-child(1) > span.chapter.font-meta > a', col).text())
            const subtitle: string = `Chapter ${latest_num}`

            if (!id || !title) continue

            if (collectedIds.includes(id)) continue
            comics.push(createMangaTile({
                id: id,
                image: encodeURI(image),
                title: createIconText({ text: decodeHTMLEntity(title) }),
                subtitleText: createIconText({ text: subtitle }),
            }))
            collectedIds.push(id)
        }
    }
    return comics
}

export const parseSearch = ($: CheerioStatic): MangaTile[] => {
    const mangaItems: MangaTile[] = []
    const collectedIds: string[] = []

    for (const manga of $('div.bs', '#content > div.wrapper > div.postbody > div.bixbox > div.listupd').toArray()) {
        let image: string = encodeURI($('div.bsx > a > div.limit > img', manga).first().attr('src')) ?? ''

        const title: string = $('div.bsx > a > div.bigor > div.tt', manga).first().text().trim() ?? ''
        const id: string = $('div.bsx > a', manga).attr('href').split('/')[4] ?? ''
        const subtitle: string = $('div.bsx > a > div.bigor > div.adds > div.epxs', manga).first().text().trim() ?? ''
        
        if (!id || !title || !image) continue

        if (collectedIds.includes(id)) continue
        mangaItems.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }))
        collectedIds.push(id)

    }
    return mangaItems
}

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}

export const isLastPage = ($: CheerioStatic): boolean => {
    let isLast = false
    const lastPage = $('div.wrap > div > div.site-content > div > div > div > div > div > div > div.c-blog-listing.c-page__content.manga_content > div > div > div.col-12.col-md-12 > div > a.last').attr("href").split("/")[4] ?? 575
    const currentPage = $('div.wrap > div > div.site-content > div > div > div > div > div > div > div.c-blog-listing.c-page__content.manga_content > div > div > div.col-12.col-md-12 > div > span.current').text()
    if (currentPage >= lastPage) isLast = true
    return isLast
}

export const parseTags = ($: CheerioStatic): TagSection[] | null => {
    const arrayTags: Tag[] = []

    for (const tag of $('li', '#sidebar > div.section > ul.genre').toArray()) {
        const label = $('a',tag).text().trim()
        const id = $('a',tag).attr('href')?.split("/")[4] ?? ''
        if (!id || !label) continue
        arrayTags.push({ id: id, label: label })
    }
    
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]
    console.log(tagSections)
    return tagSections
}