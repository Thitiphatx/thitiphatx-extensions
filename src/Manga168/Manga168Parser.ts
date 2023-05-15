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

    // title
    const titles: string[] = []
    for (const title of $('div.seriestucon > div.seriestuheader > div.seriestualt').text().trim().split(', ')) {
        titles.push(decodeHTMLEntity(title))
    }
    
    let image: string = encodeURI($('div.seriestucon > div.seriestucontent > div.seriestucontl > div.thumb > img').attr('src')) ?? 'https://i.imgur.com/GYUxEX8.png'
    const description: string = decodeHTMLEntity($('div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestuhead > div.entry-content.entry-content-single > p:nth-child(1)').text().trim() ?? '')
    const infomation = $('div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestucont > div.seriestucontr > table.infotable > tbody').text()
    const author: string = parseInfo(infomation, 'Author')
    const artist: string = parseInfo(infomation, 'Artist')
    const rawStatus: string = parseInfo(infomation, 'สถานะ')
    let hentai = false
    let status = MangaStatus.COMPLETED
    if (rawStatus == 'Ongoing') status = MangaStatus.ONGOING

    const arrayTags: Tag[] = []
    for (const tag of $('a', 'div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestucont > div.seriestucontr > div.seriestugenre').toArray()) {
        const label: string = $(tag).text().trim()
        const id: string = $(tag).attr('href').split('/')[4] ?? label

        if (!label) continue
        arrayTags.push({ id: id, label: label })
    }
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]

    return createManga({
        id: mangaId,
        titles: titles,
        author,
        artist,
        image: image,
        hentai: hentai,
        status: status,
        desc: description,
        tags: tagSections,
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    let i = 0

    for (const chapter of $('li', '#chapterlist > ul.clstyle').toArray()) {
        i++
        const title: string = $('div.chbox > div.eph-num > a > span.chapternum', chapter).text().trim() ?? ''
        const chapterId: string = $('div.chbox > div.eph-num > a', chapter).attr('href')?.split('/')[3] ?? ''

        if (!chapterId) continue

        const chapNum = Number($(chapter).attr('data-num'))
        const time = $('div > div > a > span.chapterdate', chapter).text().trim()
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
    let long: boolean = false;
    for (const images of $('#readerarea').text().trim().split('<br />')) {

        let image: string | undefined = parseInfo(images, 'src=').replaceAll('"', '').split(' ')[0]
        if (image && image.startsWith('/')) image = 'https:' + image
        if (image) pages.push(encodeURI(image))
    }
    if (pages.length == 1) {
        long = true;
    }

    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId,
        pages: pages,
        longStrip: long,
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
    const weeklySection = createHomeSection({ id: 'weekly_comic', title: 'รายสัปดาห์', view_more: false })
    const monthlySection = createHomeSection({ id: 'monthly_comic', title: 'รายเดือน', view_more: false })
    const popularSection = createHomeSection({ id: 'popular_comic', title: 'ตลอดกาล', view_more: false })


    // Latest Section
    const latestSection_Array: MangaTile[] = []
    for (const comic of $('div.utao.styletwo > div.uta', '#content > div.wrapper > div.postbody > div.bixbox > div.listupd').toArray()) {
        let image: string = $('div.imgu > a.series > img', comic).first().attr('src') ?? ''

        const title: string = $('div.luf > a.series', comic).first().attr('title') ?? ''
        const id: string = $('div.luf > a.series', comic).attr('href').split('/')[4] ?? ''
        const subtitle: string = $('div.luf > ul > li:nth-child(1) > a', comic).text() ?? ''
        if (!id || !title) continue

        latestSection_Array.push(createMangaTile({
            id: id,
            image: encodeURI(image),
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }))
    }
    latestSection.items = latestSection_Array
    sectionCallback(latestSection)

    // Weekly Section
    const weeklySection_Array: MangaTile[] = []
    for (const comic of $('li', '#wpop-items > div.serieslist.pop.wpop.wpop-weekly > ul').toArray()) {
        const image: string = $('div.imgseries > a > img', comic).first().attr('src') ?? ''
        const title: string = $('div.leftseries > h3 > a.series', comic).text() ?? ''
        const id: string = $('div.leftseries > h3 > a.series', comic).attr('href').split('/')[4] ?? ''
        if (!id || !title) continue

        weeklySection_Array.push(createMangaTile({
            id: id,
            image: encodeURI(image),
            title: createIconText({ text: decodeHTMLEntity(title) }),
        }))
    }
    weeklySection.items = weeklySection_Array
    sectionCallback(weeklySection)

    // Monthly Section
    const monthlySection_Array: MangaTile[] = []
    for (const comic of $('li', '#wpop-items > div.serieslist.pop.wpop.wpop-monthly > ul').toArray()) {
        const image: string = $('div.imgseries > a > img', comic).first().attr('src') ?? ''
        const title: string = $('div.leftseries > h3 > a.series', comic).text() ?? ''
        const id: string = $('div.leftseries > h3 > a.series', comic).attr('href').split('/')[4] ?? ''
        if (!id || !title) continue

        monthlySection_Array.push(createMangaTile({
            id: id,
            image: encodeURI(image),
            title: createIconText({ text: decodeHTMLEntity(title) }),
        }))
    }
    monthlySection.items = monthlySection_Array
    sectionCallback(monthlySection)

    // Popular Section
    const popularSection_Array: MangaTile[] = []
    for (const comic of $('li', '#wpop-items > div.serieslist.pop.wpop.wpop-alltime > ul').toArray()) {
        const image: string = $('div.imgseries > a > img', comic).first().attr('src') ?? ''
        const title: string = $('div.leftseries > h3 > a.series', comic).text() ?? ''
        const id: string = $('div.leftseries > h3 > a.series', comic).attr('href').split('/')[4] ?? ''
        if (!id || !title) continue

        popularSection_Array.push(createMangaTile({
            id: id,
            image: encodeURI(image),
            title: createIconText({ text: decodeHTMLEntity(title) }),
        }))
    }
    popularSection.items = popularSection_Array
    sectionCallback(popularSection)
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
    const pages = []
    for (const page of $('a.page-numbers', '#content > div.wrapper > div.postbody > div.bixbox > div.listupd > div.pagination').toArray()) {
        const p = Number($(page).text().trim())
        if (isNaN(p)) continue
        pages.push(p)
    }
    const lastPage = Math.max(...pages)
    const currentPage = Number($('#content > div.wrapper > div.postbody > div.bixbox > div.listupd > div.pagination > span').text().trim())
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

const parseInfo = (info: string, label: string): string => {
    let data: string = ''
    let index = info.indexOf(label);

    if (index !== -1) {
        data = info.substr(index + label.length).trim().split('\n')[0] ?? '';
    }

    return data
}

const parseDate = (date: string): Date => {
    const monthMap: {[key: string]: string } = {
        'มกราคม': 'January',
        'กุมภาพันธ์': 'February',
        'มีนาคม': 'March',
        'เมษายน': 'April',
        'พฤษภาคม': 'May',
        'มิถุนายน': 'June',
        'กรกฎาคม': 'July',
        'สิงหาคม': 'August',
        'กันยายน': 'September',
        'ตุลาคม': 'October',
        'พฤศจิกายน': 'November',
        'ธันวาคม': 'December'
    }

    const THmonth: string = date.split(' ')[0] ?? ''
    const day: string = date.split(' ')[1] ?? ''
    const year: string = date.split(' ')[2] ?? ''

    const month = monthMap[THmonth];
    const time = new Date(`${month} ${day} ${year}`)

    return time
}

const parseDateTime = (date: string): Date => {
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