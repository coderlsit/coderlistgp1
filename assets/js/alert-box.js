const inputFieldChanges = document.querySelectorAll('.this-field');

window.onbeforeunload = function(){
    if(anyChanges){
        return 'You may have unsaved changes, are you sure you want to leave the page?';
    }
};

inputFieldChanges.forEach((input) => {
    input.addEventListener('change', () => {
        anyChanges = true;
    });
});
