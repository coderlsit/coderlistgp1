const saveThisButtons = document.querySelectorAll('.save-this');
function getThisTableItemData(index){
    const thisTableItemData = {
        pageId: document.querySelectorAll('.page_id')[index].value,
        isPublished: document.querySelectorAll('.is-published')[index].checked == true ? true : '',
        isHomePageGrid: document.querySelectorAll('.is-homepage-grid')[index].checked == true ? true : '',
        isNavMenuItem: document.querySelectorAll('.is-nav-menu')[index].checked == true ? true : ''
    };
    console.log(index);
    saveThisTableItemInDB(thisTableItemData);
}
function saveThisTableItemInDB(data){
    console.log("DATA", data);
    return fetch(`/users/save-order:${thisTableItemData.pageId}`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    }).then(response => {
        return response;
    })
    .then(message => {
        if(message.status == 200){
            window.location.href = '/users/dashboard';
        }
        console.log(message);
    })
    .catch(error => console.log(`There was an error: ${error}`));
}

saveThisButtons.forEach((button, index) => {
    button.addEventListener('click', event => {
        getThisTableItemData(index);
        event.preventDefault();
    }, index);
});
