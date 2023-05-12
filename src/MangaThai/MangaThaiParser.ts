import {
    Chapter,
    ChapterDetails,
    HomeSection,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
} from 'paperback-extensions-common'

import entities = require('entities')

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): Manga => {

    const titles: string[] = []
    titles.push(decodeHTMLEntity($('#thisPostname').first().text().trim()))

    let image: string = $('#img-pc > div.aniframe > img.img-responsive').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png'

    const description: string = decodeHTMLEntity($('body > div.container > div.panel.panel-info > div.panel-body > div > div.col-lg-9.col-sm-8.col-xs-12 > div > div > p').text().trim() ?? '')
    let hentai = false

    const rawStatus: string = $('div.container > div.panel.panel-info > div.panel-body > div > div.col-lg-9.col-sm-8.col-xs-12 > p:nth-child(2) > span').text() ?? ''
    let status = MangaStatus.ONGOING
    if (rawStatus == 'จบ') status = MangaStatus.COMPLETED
    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        hentai: hentai,
        status: status,
        desc: description,
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    let i = 0

    for (const chapter of $('tr', 'body > div.container > div.table-responsive > table > tbody').toArray()) {
        i++
        const title: string = $('td.chapter-name > a', chapter).text().trim().replace(/[^\d.-]/g, '') ?? ''
        const chapterId: string = $('td.chapter-name > a', chapter).attr('href')?.split('/')[4] ?? ''

        if (!chapterId) continue

        const chapNum = Math.abs(Number(chapterId.replace(/[^\d.-]/g, '')))
        const time = $('td:nth-child(2)', chapter).text().trim()
        const date: Date = parseDate(time)

        if (!chapterId || !title) continue

        chapters.push({
            id: chapterId,
            mangaId,
            name: decodeHTMLEntity(`ตอนที่. ${title}`),
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

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []

    for (const images of $('img', 'div.container-fluid > center > div.display_content').toArray()) {
        let image: string | undefined = $(images).attr('src')?.trim()
        if (image && image.startsWith('/')) image = 'https:' + image
        if (image) pages.push(image)
    }

    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId,
        pages: pages,
        longStrip: false,
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

    for (const manga of $('div.col-lg-3.col-md-3.col-sm-4.col-smx-4.col-xs-6 > div.aniframe', 'div.container').toArray()) {
        const id: string = $('a.manga-title', manga).attr('href').split('/')[3] ?? ''
        const sub: string[] = $('span.label-update.label.label-default.label-ago', manga).first().text().trim().split(' ') ?? ''

        let mangaDate = parseDate(`${sub[0]} ${sub[1]}`)

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
    // const popularSection = createHomeSection({ id: 'popular_manga', title: 'Popular Manga', view_more: true })
    // const completeSection = createHomeSection({ id: 'complete_manga', title: 'Complete Manga', view_more: true })
    // const ongoingSection = createHomeSection({ id: 'ongoing_manga', title: 'On-going Manga', view_more: true })

    const latestSection_Array: MangaTile[] = parseSectionManga($)
    latestSection.items = latestSection_Array
    sectionCallback(latestSection)

    // switch (section) {
    //     case 1:
    //         break
    //     case 2:
    //         const popularSection_Array: MangaTile[] = parseSectionManga($)
    //         popularSection.items = popularSection_Array
    //         sectionCallback(popularSection)
    //         break
    //     case 3:
    //         const completeSection_Array: MangaTile[] = parseSectionManga($)
    //         completeSection.items = completeSection_Array
    //         sectionCallback(completeSection)
    //         break
    //     case 4:
    //         const ongoingSection_Array: MangaTile[] = parseSectionManga($)
    //         ongoingSection.items = ongoingSection_Array
    //         sectionCallback(ongoingSection)
    //         break
    //     default:
    //         throw new Error('No requested section exist')
    // }

}


const parseSectionManga = ($: CheerioStatic): MangaTile[] => {
    const manga_Array: MangaTile[] = []

    for (const comic of $('div.col-lg-3.col-md-3.col-sm-4.col-smx-4.col-xs-6 > div.aniframe', 'div.container').toArray()) {
        let image: string = encodeURI($('a:nth-child(2) > img', comic).first().attr('src')) ?? ''

        const title: string = $('a.manga-title', comic).first().text().trim() ?? ''
        const id: string = $('a.manga-title', comic).attr('href').split('/')[3] ?? ''
        const sub: string[] = $('span.label-update.label.label-default.label-ago', comic).first().text().trim().split(' ') ?? ''
        const subtitle: string = `${sub[0]} ${sub[1]}${sub[2]}` ?? ''
        if (!id || !title) continue

        manga_Array.push(createMangaTile({
            id: id,
            image: image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }))
    }
  
    return manga_Array
  }

export const parseViewMore = ($: CheerioStatic): MangaTile[] => {
    const comics: MangaTile[] = []
    const collectedIds: string[] = []

    for (const item of $('div.col-lg-3.col-md-3.col-sm-4.col-smx-4.col-xs-6 > div.aniframe', 'div.container').toArray()) {
        let image: string = encodeURI($('a:nth-child(2) > img', item).first().attr('src')) ?? ''

        const title: string = $('a.manga-title', item).first().text().trim() ?? ''
        const id: string = $('a.manga-title', item).attr('href').split('/')[3] ?? ''
        const sub: string[] = $('span.label-update.label.label-default.label-ago', item).first().text().trim().split(' ') ?? ''
        const subtitle: string = `${sub[0]} ${sub[1]}${sub[2]}` ?? ''

        if (!id || !title) continue

        if (collectedIds.includes(id)) continue
        comics.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }))
        collectedIds.push(id)

    }
    return comics
}

export const parseSearch = ($: CheerioStatic): MangaTile[] => {
    const mangaItems: MangaTile[] = []
    const collectedIds: string[] = []

    for (const manga of $('div.col-lg-3.col-md-3.col-sm-4.col-smx-4.col-xs-6 > div.aniframe', 'div.container').toArray()) {
        let image: string = encodeURI($('a:nth-child(2) > img', manga).first().attr('src')) ?? ''

        const title: string = $('a.manga-title', manga).first().text().trim() ?? ''
        const id: string = $('a.manga-title', manga).attr('href').split('/')[3] ?? ''
        const sub: string[] = $('span.label-update.label.label-default.label-ago', manga).first().text().trim().split(' ') ?? ''
        const subtitle: string = `${sub[0]} ${sub[1]}${sub[2]}` ?? ''
        
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
    const pages = []
    for (const page of $('li a', 'body > div:nth-child(4) > center > ul.pagination.pagination-lg').toArray()) {
        const p = Number($(page).text().trim())
        if (isNaN(p)) continue
        pages.push(p)
    }
    const lastPage = Math.max(...pages)
    const currentPage = Number($('body > div:nth-child(4) > center > ul > li.active').text().trim())
    if (currentPage >= lastPage) isLast = true
    return isLast
}

const parseDate = (date: string): Date => {
    let time: Date
    const number = Number(date.replace(/[^0-9]/g, ''))
    if (date.includes('LESS THAN AN HOUR') || date.includes('JUST NOW')) {
        time = new Date(Date.now())
    } else if (date.includes('ปี') || date.includes('YEARS')) {
        time = new Date(Date.now() - (number * 31556952000))
    } else if (date.includes('เดือน') || date.includes('MONTHS')) {
        time = new Date(Date.now() - (number * 2592000000))
    } else if (date.includes('อาทิตย์') || date.includes('WEEKS')) {
        time = new Date(Date.now() - (number * 604800000))
    } else if (date.includes('YESTERDAY')) {
        time = new Date(Date.now() - 86400000)
    } else if (date.includes('วัน') || date.includes('DAYS')) {
        time = new Date(Date.now() - (number * 86400000))
    } else if (date.includes('ชั่วโมง') || date.includes('HOURS')) {
        time = new Date(Date.now() - (number * 3600000))
    } else if (date.includes('นาที') || date.includes('MINUTES')) {
        time = new Date(Date.now() - (number * 60000))
    } else if (date.includes('วินาที') || date.includes('SECONDS')) {
        time = new Date(Date.now() - (number * 1000))
    } else {
        const split = date.split('-')
        time = new Date(Number(split[2]), Number(split[0]) - 1, Number(split[1]))
    }
    return time
}