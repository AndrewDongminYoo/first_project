let user = null
let latitude = 37.5559598
let longitude = 126.9723169
window.onload = function () {
    geoFindMe();
    userCheck()
}

function geoRefresh() {
    $(".column-0").empty()
    $(".column-1").empty()
    $(".column-2").empty()
    geoFindMe()
    userCheck()
}

async function getFoods(lat, long) {
    const response = await fetch(`/api/shop?lat=${lat}&lng=${long}`);
    return await response.json()
}

function geoFindMe() {
    if (!navigator.geolocation) {
        window.alert('위치 권한을 허용해 주세요!!')
        console.log('Geolocation is not supported by your browser');
    } else {
        console.log('Locating…');
        navigator.geolocation.getCurrentPosition(success, error);
    }

    function success(position) {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        getFoods(latitude, longitude)
        .then(restaurants => {
            let categories = []
            restaurants.forEach((restaurant, index) => {
                categories.push(...restaurant['categories'])
                let i = index % 3
                showCards(restaurant, i)
            }) // tempHtml append 하기
            let unique = new Set(categories)
            categories = [...unique]
            console.log(categories)
        })  // like 여부에 따라 html 달리 할 필요가 있을까..?
    }
    function error(e) {
        console.error(e)
    }
}

const userCheck = () => {
    user = localStorage.getItem("delivery-uuid")
    if (user === null) {
        user = uuidv4()
        localStorage.setItem("delivery-uuid", user)
        console.log(user)
    }
    showBookmarks(user);
}

function keep(id) {
    event.target.classList.add('is-hidden')
    const headers = new Headers();
    headers.append('content-type', 'application/json')
    const body = JSON.stringify({uuid: user, ssid: id, action: 'like'});
    const init = {method: 'POST', headers, body};
    fetch(`/api/like`, init)
        .then((r) => r.headers.get('content-type').includes('json') ? r.json() : r.text())
        .then((r) => console.log(r))
        .catch((e) => console.log(e));
    event.target.nextElementSibling.classList.remove('is-hidden')
} // 특정 상점 좋아요하기

function remove(id) {
    event.target.classList.add('is-hidden')
    const headers = new Headers();
    headers.append('content-type', 'application/json')
    const body = JSON.stringify({uuid: user, ssid: id, action: 'dislike'});
    const init = {method: 'POST', headers, body};
    fetch(`/api/like`, init)
        .then((r) => r.headers.get('content-type').includes('json') ? r.json() : r.text())
        .then((r)=> console.log(r))
        .catch((e) => console.log(e));
    event.target.previousElementSibling.classList.remove('is-hidden')
} // 특정 상점 좋아요 취소하기

function showBookmarks(user) {
    fetch(`/api/like?uuid=${user}`)
        .then((r) => r.headers.get('content-type').includes('json') ? r.json() : r.text())
        .then((res) => {
            $("#bookmarks").empty();
            res['restaurants'].forEach((r)=>bookMark(r));
        })
        .catch((e) => console.log(e));
} // 모든 즐겨찾기 상품 조회하기

const bookMark = (restaurant) => {
    let { ssid, name, phone, time } = restaurant;
    let tempHtml = `<li class="bookmark"><span class="mark-menu">${name}</span><button class="button is-xs is-inline-block">x</button></li>`
    $("#bookmarks").append(tempHtml)
}

const showCards = (restaurant, i) => {
    let {id, name, reviews, owner, categories, image, logo, address, rating, time, min_order} = restaurant;
    if (!image) {
        return
    }
    let tempHtml = `
        <div class="food-card card">
            <div class="image-box card-image">
                <figure class="image">
                    <img class="food-image image" src="${image}"
                         alt="food-thumbnail">
                </figure>
            </div>
            <div class="tool-box">
                <div class="book-mark">
                    <div class="store_name">${name}<br>⭐${rating}점</div>
                    <button class="button book-button" onclick="keep('${id}')">⭐keep</button>
                    <button class="button book-button is-hidden" onclick="remove('${id}')">🌟delete</button>
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
    categories.forEach((tag)=>{
        btn += `<button class="button is-rounded is-warning is-outlined" onclick="highlight('${tag}')">#${tag}</button>`
    })
    $(`.column-${i}`).append(tempHtml.replace("{__buttons__}", btn))
}

// 직접적으로 주소를 입력해서 배달 음식점을 찾고자 할 때 쓰입니다.
function search() {
    let query = $("#geoSearch").val()
    const headers = new Headers();
    headers.append('content-type', 'application/json')
    const body = JSON.stringify({query: query});
    const init = {method: 'POST', headers, body};
    fetch(`/api/address`, init)
        .then((r) => r.headers.get('content-type').includes('json') ? r.json() : r.text())
        .then((result) => {
            longitude = Number(result['long']).toFixed(7)
            latitude = Number(result['lat']).toFixed(7)
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

// URl 끝의 # 값이 변하면 그에 맞게 새롭게 리스트를 받아옵니다 (sort 바꿔줌)
window.addEventListener('hashchange', async ()=> {
    let hash = window.location.hash
    const response = await fetch(`/api/shop?lat=${latitude}&lng=${longitude}&order=${hash.substring(1)}`);
    let restaurants = await response.json()
    $(".column-0").empty()
    $(".column-1").empty()
    $(".column-2").empty()
    restaurants.forEach((restaurant, index) => {
        let i = index % 3
        showCards(restaurant, i)
    }) // tempHtml append 하기
})