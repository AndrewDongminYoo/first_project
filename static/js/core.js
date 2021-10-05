let user = null, latitude = 37.5559598, longitude = 126.1699723, isMobile = false;
// 유저의 값을 글로벌하게 사용하기 위해 초기화한다.
// 위도와 경도를 서울역을 기준으로 초기화한다. (사용자 접속 시 사용자의 위치로 이동)
window.onload = function () {
    geoFindMe(); userCheck(); weather().then(); device_check();
};
const error = () => NoGeoDontWorry();

function device_check() {
    const pc = "win16|win32|win64|mac|macintel";
    const this_device = navigator.platform;
    if (this_device) {
        isMobile = pc.indexOf(navigator.platform.toLowerCase()) < 0;
    }
    console.log(isMobile? "It's on mobile" : "It's Computer")
}

async function weather() {
    const weatherBox = $("#weather-box")
    weatherBox.empty();
    weatherBox.append(`
        <div class="weather-title">현재날씨</div>
        <table class="table is-narrow bm-current-table" style="margin: auto;">
        <thead><tr><th>온도</th><th>습도</th><th>풍속</th><th>날씨</th><th>아이콘</th></tr></thead></table>
        `);
    await weatherBox.append(`
        <div class="weather-title">4일 동안의 일일 예보</div>
        <table class="table is-narrow bm-daily-table" style="margin: auto;"><thead><tr>
        <th>아침온도</th><th>낮온도</th><th>저녁온도</th><th>밤온도</th><th>습도</th><th>아이콘</th>
        </tr></thead></table>
        `);
    let apikey = "fa5d5576f3d1c8248d37938b4a3b216b"
    const url = 'https://api.openweathermap.org/data/2.5/onecall?' +
        'lat=' + latitude.toFixed(7) +
        '&lon=' + longitude.toFixed(7) +
        `&appid=${apikey}&lang=kr&units=metric`;
    const response = await fetch(url).then((res) => res.json()).catch()
    const { current, daily } = await response;
    const { feels_like, humidity, weather, wind_speed } = await current;
    const { description, icon } = await weather[0];
    daily.length = 4;

    $(".bm-current-table").append(`
        <tbody><tr>
        <td>${Math.floor(feels_like)} ℃</td>
        <td>${humidity} %</td>
        <td>${wind_speed} m/s</td>
        <td>${description}</td>
        <td><img src="http://openweathermap.org/img/w/${icon}.png" alt="${description}"></td>
        </tr></tbody>
    `);

    await daily.forEach((w) => {
        const { feels_like, humidity, weather } = w;
        const { day, night, eve, morn } = feels_like;
        const { description, icon } = weather[0];

        $(".bm-daily-table").append(`
            <tbody><tr>
            <td>${morn.toFixed(1)} ℃</td>
            <td>${day.toFixed(1)} ℃</td>
            <td>${eve.toFixed(1)} ℃</td>
            <td>${night.toFixed(1)} ℃</td>
            <td>${humidity} %</td>
            <td><img src="http://openweathermap.org/img/w/${icon}.png" title="${description}" alt="${description}"></td>
            </tr></tbody>
        `);
    })
}

//
function geoRefresh() {
    $(".column-0").empty()
    $(".column-1").empty()
    $(".column-2").empty()
    geoFindMe(); // 사용자의 위치 다시 받아내기
    userCheck(); // 사용자가 처음 접속한 사람인지 확인
}

// 위도 경도에 따라 주변 맛집을 받아오는 내부 api 송출
async function getFoods(lat, long) {
    if (!(lat && long)) {
        const response = await fetch(`/api/shop?lat=${latitude.toFixed(7)}&lng=${longitude.toFixed(7)}`);
        return await response.json()
    } else {
        const response = await fetch(`/api/shop?lat=${lat}&lng=${long}`);
        return await response.json()
    }
}

// geoLocation api 이용한 현재 사용자의 위치 받아내는 코드
function geoFindMe() {
    if (!navigator.geolocation) {
        console.log('Geolocation is not supported by your browser');
    } else {
        navigator.geolocation.getCurrentPosition(success, error);
    }
}

//위치 받아내기 성공했을 때의 메소드
function success(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    // weather(latitude,longitude)
    getFoods(latitude, longitude)
        .then(restaurants => {
            $(".column-0").empty()
            $(".column-1").empty()
            $(".column-2").empty()
            let categories = []
            restaurants.forEach((restaurant, index) => {
                categories.push(...restaurant['categories'])
                let i = isMobile ? index % 2 : index % 3
                showCards(restaurant, i)
            }) // tempHtml append 하기
            let unique = new Set(categories)
            categories = [...unique]
            isMobile || modal()
            categories = categories.filter((v) => v !== '1인분주문')
            shuffle(categories)
            let tempHTML = "<span>[</span>";
            categories.forEach((word, i) => {
                tempHTML += `<span class="word word-${i}">${word}, </span>`;
            })
            tempHTML += "<span>]</span>";
            document.querySelector(".modal-content").innerHTML = tempHTML;
            everybodyShuffleIt(categories).then((result) => result && console.log(`오늘은 ${result} 먹자!!`))
            document.querySelector("#modal").classList.remove('is-active')
        })  // like 여부에 따라 html 달리 할 필요가 있을까..?
}

async function NoGeoDontWorry() {
    const response = await fetch(`/api/shop?lat=${latitude.toFixed(7)}&lng=${longitude.toFixed(7)}`);
    let restaurants = await response.json()
    $(".column-0").empty()
    $(".column-1").empty()
    $(".column-2").empty()
    restaurants.forEach((restaurant, index) => {
        let i = index % 3
        showCards(restaurant, i)
    }) // tempHtml append 하기
}

// 모달 + 모달 닫기 위한 닫기 버튼과 어두운 배경 나타내기

function modal() {
    // if (isMobile) return;
    $('#modal').addClass('is-active')
}

// 로컬 스토리지에 사용자의 uuid 가 있는지 확인하고 없으면 새로 발급한다.
const userCheck = () => {
    null === (user = localStorage.getItem("delivery-uuid")) && (user = uuidv4(), localStorage.setItem("delivery-uuid", user)), setTimeout(() => showBookmarks(user), 2e3)
};

// 특정 식당을 즐겨찾기 하는 코드
function keep(ssid, min_order) {
    changeBtn(ssid, false)
    const headers = new Headers();
    headers.append('content-type', 'application/json')
    const body = JSON.stringify({ uuid: user, ssid: ssid, 'min_order': min_order, action: 'like' });
    sendLike(user, headers, body)
}

// 특정 식당을 즐겨찾기 삭제하는 코드
function remove(ssid) {
    changeBtn(ssid, true)
    const headers = new Headers();
    headers.append('content-type', 'application/json')
    const body = JSON.stringify({ uuid: user, ssid: ssid, action: 'dislike' });
    sendLike(user, headers, body)
}

// remove 코드의 메인 부분만을 추출한 코드 (북마크 탭에서 직접 삭제 다루기 위해 분리)
function delMark(ssid) {
    changeBtn(ssid, true)
    const headers = new Headers();
    headers.append('content-type', 'application/json')
    const body = JSON.stringify({ uuid: user, ssid: ssid, action: 'dislike' });
    sendLike(user, headers, body)
}

function changeBtn(ssid, afterDelete) {
    if (afterDelete) {
        $(`#delete-${ssid}`).addClass("is-hidden")
        $(`#keep-${ssid}`).removeClass("is-hidden")
    } else {
        $(`#keep-${ssid}`).addClass("is-hidden")
        $(`#delete-${ssid}`).removeClass("is-hidden")
    }
}

// 즐겨찾기에 등록 or 해제 하는 코드의 공통 코드 추출
function sendLike(user, headers, body) {
    const init = { method: 'POST', headers, body };
    fetch(`/api/like`, init)
        .then((r) => r.headers.get('content-type').includes('json') ? r.json() : r.text())
        .then(() => {
            showBookmarks(user);
        })
        .catch((e) => console.log(e));
}

// 즐겨찾기 목록을 불러오는 코드 ("즐겨찾기목록")이라는 헤더도 이 때 보여줌.
function showBookmarks(user) {
    $("h2.h2").show()
    fetch(`/api/like?uuid=${user}`)
        .then((r) => r.headers.get('content-type').includes('json') ? r.json() : r.text())
        .then((res) => {
            $("#bookmarks").empty();
            res['restaurants'] && res['restaurants'].forEach((r) => bookMark(r)); // 북마크 배열이 '도착하면' 렌더링
        })
        .catch((e) => console.log(e));
    $("#aside").addClass("open");
}

// 즐겨찾기 목록에 북마크 내용들을 담아 넣는 코드
const bookMark = (restaurant) => {
    let { ssid, name, phone, time } = restaurant;
    let tempHtml = `
    <li class="bookmark is-hoverable panel-block" title="전화번호: ${phone} / 영업시간: ${time}" id="pop-${ssid}" onclick="popUp('${ssid}')">
    <span class="mark-menu">${name}</span>
    <button class="button is-xs is-inline-block" onclick="delMark('${ssid}')" onmouseover="">⨉</button></li>`
    $("#bookmarks").append(tempHtml)
}

// 즐겨찾기 클릭시 모달창 오픈
function popUp(ssid) {
    $.ajax({
        url: `/api/detail?ssid=${ssid}`,
        type: 'GET',
        data: {},
        success: (function (restaurant) {
            let { image, name, address, time, min_order, phone, categories } = restaurant;
            let tempHtml = `
                <div class="pop-up-card">
                    <button class="button close-button" onclick="$('#low-modal-body').hide();">⨉</button>
                    <div class="pop-card-head">
                        <img class="pop-card-head-image" src="${image}" alt="${name}">
                    </div>
                    <div class="pop-card-content-1">
                        <div class="pop-card-store-name">"${name}"</div>
                        <div class="pop-card-hash">{__buttons__}</div>
                    </div>
                    <div class="pop-card-content-2">
                        <div class="pop-card-address">${address ? address : "주소가 정확하지 않습니다."}</div>
                        <div class="pop-card-schedule">영업시간: ${time ? time : "영업시간 정보가 없습니다."}</div>
                        <div class="pop-card-min">${min_order ? min_order : "---"} 원 이상 주문가능</div>
                        <div class="pop-card-phone-number">${phone ? phone : "전화번호가 없습니다."}</div>
                    </div>
                </div>`
            // 각 카드의 카테고리 해시태그를 replace 하는 가상 template 코드
            let btn = ""
            categories.forEach((tag) => btn += `<span>#${tag}</span>`)
            let lowModal = $('#low-modal-body');
            lowModal.show()
            lowModal.html(tempHtml.replace("{__buttons__}", btn))
            // 특정 즐겨찾기 메뉴 클릭시 팝업창이 띄어짐과 동시에 해당 즐겨찾기 메뉴가 흰색으로 바뀐다.
        })
    })
}

// URl 끝의 # 값이 변하면 그에 맞게 새롭게 리스트를 받아옵니다 (sort 바꿔줌)
window.addEventListener('hashchange', async () => {
    let hash = window.location.hash.substring(1)
    const response = await fetch(`/api/shop?order=${hash}&lat=${latitude}&lng=${longitude}`);
    let restaurants = await response.json()
    $(".column-0").empty()
    $(".column-1").empty()
    $(".column-2").empty()
    restaurants.forEach((restaurant, index) => {
        let i = index % 3
        showCards(restaurant, i)
    })
})

// 레스토랑 하나하나의 카드를 만들어내는 코드
const showCards = (restaurant, i) => {
    let {
        id, name, reviews,
        owner, categories,
        image, address,
        rating, time, min_order
    } = restaurant;
    // 이미지가 없는 경우 VIEW 가 좋지 않아 리턴시킨다.
    if (!image) return;
    let tempHtml = `
    <div class="food-card card">
        <div class="image-box card-image">
            <figure class="image" title="${time}">
                <img class="food-image image" src="${image}"
                     alt="${name}-food-thumbnail">
            </figure>
        </div>
        <div class="tool-box">
            <div class="book-mark">
                <div class="store_name">${name}<br>⭐${rating}점</div>
                <button class="button book-button" id="keep-${id}" onclick="keep('${id}', '${min_order}')">⭐keep</button>
                <button class="button book-button is-hidden" id="delete-${id}" onclick="remove('${id}')">🌟delete</button>
            </div>
            <div class="buttons are-small" id="btns${i}">{__buttons__}</div>
            <div class="card-footer">
                <div>${address}<br>영업시간: ${time}<br>${min_order}원 이상 주문 가능</div>
                <div class="reviews">
                    <div class="reviews-count">주문자리뷰 ${reviews}<br>사장님댓글 ${owner}</div>
                </div>
            </div>
        </div>
    </div>`
    let btn = ""
    // 각 카드의 카테고리 해시태그를 replace 하는 가상 template 코드
    categories.forEach((tag) => {
        btn += `<button class="button is-rounded is-warning is-outlined" onclick="highlight('${tag}')">#${tag}</button>`
    })
    $(`.column-${i}`).append(tempHtml.replace("{__buttons__}", btn))
}

// 직접적으로 주소를 입력해서 배달 음식점을 찾고자 할 때 쓰입니다.
function search() {
    let query = $("#geoSearch").val()
    const headers = new Headers();
    headers.append('content-type', 'application/json')
    const body = JSON.stringify({ query: query });
    const init = { method: 'POST', headers, body };
    fetch(`/api/address`, init)
        .then((r) => r.headers.get('content-type').includes('json') ? r.json() : r.text())
        .then((result) => {
            if (result['long'] && result['lat']) {
                longitude = Number(result['long']).toFixed(7)
                latitude = Number(result['lat']).toFixed(7)
            }
            return getFoods(latitude, longitude)
        }).then(restaurants => {
            $(".column-0").empty()
            $(".column-1").empty()
            $(".column-2").empty()
            restaurants.forEach((restaurant, index) => {
                let i = index % 3
                showCards(restaurant, i)
            }) // tempHtml append 하기
        }).catch((e) => console.log(e));
}

// 특정 카테고리 (예: 1인분주문) 를 클릭하면 모든 식당 중 해당 해시태그를 가진 카드가 하이라이트됩니다.
function highlight(string) {
    $("button.is-warning").not(`:contains(${string})`).addClass('is-outlined')
    $(`button.button:contains(${string})`).removeClass('is-outlined')
}

// tab 의 버튼을 클릭하면 그 버튼만 active 상태가 됩니다.
function tabFocus(string) {
    $("li.tab").not(`.tab-${string}`).removeClass('is-active');
    $(`li.tab-${string}`).addClass('is-active');
}

// 비동기처리 방식 자바스크립트를 고려한 타이머 함수
const timer = ms => new Promise(r => setTimeout(r, ms))

// 리스트의 순서를 뒤섞는 함수입니다.
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}

// 모달에 띄운 화면 속 텍스트가 번갈아가면서 빨간색으로 변하다가 멈추고 결과 출력
async function everybodyShuffleIt(array) {
    const result = shuffle(array)[0]
    for (let i = 0; i < array.length; i++) {
        await timer(60)
        $(`span.word.word-${i}`).addClass('is-red')
        $("span.word").not(`.word-${i}`).removeClass('is-red')
    }
    for (let i = 0; i < array.length; i++) {
        await timer(100)
        $(`span.word.word-${i}`).addClass('is-red')
        $("span.word").not(`.word-${i}`).removeClass('is-red')
    }
    for (let i = 0; i < array.length; i++) {
        await timer(200)
        $(`span.word.word-${i}`).addClass('is-red')
        $("span.word").not(`.word-${i}`).removeClass('is-red')
    }
    for (let i = 0; i < array.length; i++) {
        await timer(600)
        $("span.word").not(`.word-${i}`).removeClass('is-red')
        $(`span.word.word-${i}`).addClass('is-red')
        if ($(`span.word-${i}:contains('${result},')`).hasClass('is-red')) {
            $(`button.button:contains(${result})`).removeClass('is-outlined')
            await timer(100)
            alert(`오오~~ 오늘은 ${result} 먹으면 되겠다!!!!`)
            $("#modal").remove()
            return result
        }
    }
}

