/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
    Chapter,
    ChapterDetails,
    Tag,
    HomeSection,
    SourceManga,
    PartialSourceManga,
    TagSection,
    HomeSectionType
} from '@paperback/types'

import entities = require('entities')

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): SourceManga => {
    const titles: string[] = []
    const title = $('div.poppular.mb-3 > div > h1').text().replace("(แปลไทยตอนล่าสุด)", "").trim()
    titles.push(decodeHTMLEntity(title))
    
    let image: string = encodeURI($('div.poppular.mb-3 > div > div.row.mt-4 > div.col-12.col-md-3 > img').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png')
    
    let artist: string = ''

    const arrayTags: Tag[] = []
    for (const tag of $('a.post-tag').toArray()) {
        const label: string = $(tag).text().trim()
        const id: string = `${$(tag).attr('href')?.split('/')[3]}/${label}`
        if(id.includes("artist")) {
            artist = label
        }
        if (id.includes("year") || id.includes("category")) continue
        if (!label) continue
        arrayTags.push({ id: id, label: label })
    }
    const tagSections: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => App.createTag(x)) })]

    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: titles,
            image: image,
            status: "",
            artist: artist,
            tags: tagSections,
            desc: "",
        })
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    const collectedIds: string[] = []

    if ($('div:nth-child(5) > div > div.col-sm-12.col-md-9 > div:nth-child(1) > h2').text().includes("ตอนของ")) {
        for (const chapter of $('div', 'div.box').toArray()) {
            const title: string = $('div:nth-child(1) > a', chapter).text().trim() ?? ''
            const chapterId: string = $('div:nth-child(1) > a', chapter).attr('href')?.split('/')[4] ?? ''
    
            if (!chapterId) continue
    
            const chapNum = Number(title?.split("ตอนที่ ")[1]?.trim())
            const time = $('div:nth-child(2)', chapter).text().trim()
            const date: Date = parseDate(time)

            if (collectedIds.includes(chapterId)) continue
            if (!chapterId || !title) continue
            collectedIds.push(chapterId)
            
            chapters.push(App.createChapter({
                id: chapterId,
                name: title,
                langCode: '🇹🇭',
                chapNum: isNaN(chapNum) ? 0 : chapNum,
                volume: 0,
                time: date
            }))
        }
        if (chapters.length == 0) {
            throw new Error(`Couldn't find any chapters for mangaId: ${mangaId}!`)
        }
        chapters.reverse();
    }
    else {
        const title: string = $('div.poppular.mb-3 > div > h1').text().trim() ?? ''
        const time: string = $('div.poppular.mb-3 > div > div.sr-post-header > small').text()?.split("/")[0]
        const date: Date = parseDate(time);

        chapters.push(App.createChapter({
            id: mangaId,
            name: title,
            langCode: '🇹🇭',
            chapNum: 1,
            volume: 0,
            time: date
        }))
    }
    
    
    return chapters.map(chapter => {
        return App.createChapter(chapter)
    })
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []
    if (mangaId == chapterId) {
        for (const images of $('#manga-content > div.row > div.col-10.offset-1 > img').toArray()) {

            let image: string | undefined = $(images).attr("data-src")
            if (image && image.startsWith('/')) image = 'https:' + image
            if (image) pages.push(encodeURI(image))
        }
    }
    else {
        for (const images of $('#manga-content > div.row > div.col-10.offset-1 > img').toArray()) {

            let image: string | undefined = $(images).attr("src")
            if (image && image.startsWith('/')) image = 'https:' + image
            if (image) pages.push(encodeURI(image))
        }

    }
    const chapterDetails = App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages
    })
    return chapterDetails
}

export const parseHomeSections = ($: CheerioStatic, sectionCallback: (section: HomeSection) => void): void => {
    const popularSection = App.createHomeSection({
        id: 'popular',
        title: 'Most Popular',
        containsMoreItems: false,
        type: HomeSectionType.singleRowLarge
    })

    const latestSection = App.createHomeSection({
        id: 'latest',
        title: 'Latest Manga',
        containsMoreItems: true,
        type: HomeSectionType.singleRowNormal
    })

    // Popular Section
    const popularSection_Array: PartialSourceManga[] = []
    for (const comic of $('div.row.d-flex.justify-content-around.align-items-center', 'div.bg-top > div.row > div.col-sm-12.mt-2.mb-2').toArray()) {
        const image: string = $('div.col-4.text-right > a > div.img-top-image', comic).attr('style').replace("background-image:url(", "").replace(")", "").trim() ?? ''
        const title: string = $('div.col-8 > span.sr-title-sm > a', comic).text() ?? ''
        const id: string = $('div.col-8 > span.sr-title-sm > a', comic).attr('href')?.split('/')[3] ?? ''
        if (!id || !title) continue

        popularSection_Array.push(App.createPartialSourceManga({
            mangaId: id,
            image: encodeURI(image),
            title: decodeHTMLEntity(title),
        }))
    }
    popularSection.items = popularSection_Array
    sectionCallback(popularSection)

    // Latest
    const latestSection_Array: PartialSourceManga[] = []
    for (const comic of $('div.item', 'body > div:nth-child(5) > div > div.col-sm-12.col-md-9 > div:nth-child(3) > div').toArray()) {
        let image: string = $('a > div.poster', comic).attr('style').replace("background-image:url(", "").replace(")", "").trim() ?? ''

        const title: string = $('a', comic).attr('title').replace("(แปลไทยตอนล่าสุด)").trim() ?? ''
        const id: string = $('a', comic).attr('href')?.split('/')[3] ?? ''
        const subtitle: string = $('a > div.title > div.d-flex.justify-content-between.meta > div', comic).text() ?? ''
        if (!id || !title) continue

        latestSection_Array.push(App.createPartialSourceManga({
            mangaId: id,
            image: encodeURI(image),
            title: decodeHTMLEntity(title),
            subtitle: decodeHTMLEntity(subtitle),
        }))
    }
    latestSection.items = latestSection_Array
    sectionCallback(latestSection)
}

export const parseViewMore = ($: CheerioStatic): PartialSourceManga[] => {
    const comics: PartialSourceManga[] = []

    for (const comic of $('div.item', 'body > div:nth-child(5) > div > div.col-sm-12.col-md-9 > div:nth-child(3) > div').toArray()) {
        let image: string = encodeURI($('a > div.poster', comic).attr('style').replace("background-image:url(", "").replace(")", "").trim() ?? '')

        const title: string = $('a', comic).attr('title').replace("(แปลไทยตอนล่าสุด)").trim() ?? ''
        const id: string = $('a', comic).attr('href')?.split('/')[3] ?? ''
        const subtitle: string = $('a > div.title > div.d-flex.justify-content-between.meta > div', comic).text() ?? ''
        if (!id || !title) continue

        comics.push(App.createPartialSourceManga({
            mangaId: id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: decodeHTMLEntity(title),
            subtitle: decodeHTMLEntity(subtitle),
        }))

    }
    return comics
}

export const parseSearch = ($: CheerioStatic): PartialSourceManga[] => {
    const mangaItems: PartialSourceManga[] = []
    const collectedIds: string[] = []
    for (const manga of $('div.item', 'div').toArray()) {
        let image: string = $('a > div.poster', manga).attr("style").replace("background-image:url(", "").replace(")", "").trim() ?? ''

        const title: string = $('a', manga).attr('title').replace("(แปลไทยตอนล่าสุด)").trim() ?? ''
        const id: string = $('a', manga).attr('href')?.split('/')[3] ?? ''
        const subtitle: string = $('a > div.title > div.d-flex.justify-content-between.meta > div', manga).text() ?? ''
        
        if (!id || !title || !image) continue

        if (collectedIds.includes(id)) continue
        mangaItems.push(App.createPartialSourceManga({
            mangaId: id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: decodeHTMLEntity(title),
            subtitle: decodeHTMLEntity(subtitle),
        }))
        collectedIds.push(id)

    }
    return mangaItems
}

export const parseTags = ($: CheerioStatic): TagSection[] => {
    const arrayTags: Tag[] = []

    for (const tag of $('div.item', '#tags').toArray()) {
        const label = $('a',tag).text().trim()
        const id = `${$('a',tag).attr('href')?.split("/")[3]}/${label}`
        if (!id || !label) continue
        arrayTags.push({ id: id, label: label })
    }
    
    const tagSections: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => App.createTag(x)) })]
    return tagSections
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
    } else if (date.includes('สัปดาห์') || date.includes('WEEKS')) {
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

export const isLastPage = ($: CheerioStatic): boolean => {
    let isLast = false
    return isLast
}

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}