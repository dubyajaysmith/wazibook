/*global $, navigator, firebase*/
'use strict'

const config = {
	/*keys from firebase project*/
};
firebase.initializeApp(config);
const dbRef = firebase.database().ref()
const auth = firebase.auth();
const getId = (x) => document.getElementById(x)

let pjName = []
let oldProjs = []
let timerRan = false
let userDir, projects, user, accuracy, userId, timerTime, selProjName, pjs, editMode;

editMode = false

const today = new Date()
const lastWeek = new Date(today - (86400000 * 7))
const last2Week = new Date(today - (86400000 * 14))

$('.projForm, .projCard').hide()

firebase.auth().onAuthStateChanged(firebaseUser => {
	if (firebaseUser) {
		user = firebaseUser
		console.log('>>>>user')
		console.dir(user)
		userId = user.uid;
		
		
		$('.projForm, .projCard').show()
		
		userDir = firebase.database().ref('users/' + userId + '/projects').orderByChild('date')
		
		
		userDir.on('value', snap => {
			//console.log('>>>>userDir')
			let obj = snap.val()
			pjs = obj
			$.each(pjs, function(index, key) {
				
				let d = new Date(this.date)
				//console.log(d, ' VS ', today)
				let todo = ''
	
				d = d.getMonth() + ' - ' + d.getDate() + ' - ' + d.getFullYear()
		
				this.comm = this.comm ? this.comm : '(No Comments)'
		
				$('#allDataRows').append(
					'<tr>' +
						'<td>' + this.name + '</td>' +
						'<td>' + d + '</td>' +
						'<td>' + this.hour + '</td>' +
						'<td>' + this.min + '</td>' +
						'<td>' + this.comm + '</td>' +
					'</tr>'
				)
				
			})
			
			$('#allDataTable').DataTable()
			//console.dir(obj)
			handleProjects(pjs)
		})

		//console.log('>>>>Name ', user.displayName, ' ', user.email)
		//console.log('% ', user.displayName ? false : true)
		if (user.displayName) {
			$('.helloMsg').text('What\'s up ' + user.displayName)
			$('.displayName').val(user.displayName)
		}
		else {
			$('.helloMsg').append('Hey ' + user.email.substring(0, '@'))
		}

		$('main').show()
		$('.logSection').hide()
	}
	else {
		mkToast('Not Logged In', 3000, 'rounded')
		$('main').hide()
		$('.logSection').show()
	}
})
/*
$('.datepicker').pickadate({
	selectMonths: true, // Creates a dropdown to control month
})
*/

$('.login').on('click', function() {
	//console.log('clicked')
	// todo check for real email
	const email = $('.email').val()
	const pass = $('.password').val()
	const auth = firebase.auth();
	const promise = auth.signInWithEmailAndPassword(email, pass);
	promise.catch(e => mkToast(e.message, 3000, 'rounded'));
})
$('.signup').on('click', function() {
	//console.log('clicked')
	// todo check for real email
	const email = $('.email').val()

	if (validateEmail(email)) {
		const pass = $('.password').val()
		const auth = firebase.auth();
		const promise = auth.createUserWithEmailAndPassword(email, pass);
		promise.catch(e => mkToast(e.message, 3000, 'rounded'));
	}
	else {
		mkToast('Email failed validation it did.')
	}
})
$('.logout').on('click', function() {
	//console.log('clicked')
	firebase.auth().signOut();
})
$('body').on('click', '.editMode', function() {
	
	editMode = true
	
	const id = $(this).parent().children('.recName').prop('id')
	getId('pjSelect')
	
	const name = $(this).parent().children('.recName').text()

	Array.from(getId('pjSelect').options).filter((x) => {
		if(x.text == name)
			return x.selected = true
	})
	
	const hour = $(this).parent().children('.recHour').text()
	getId('inputHour').value = hour

	
	const min = $(this).parent().children('.recMin').text()
	getId('inputMin').value = min
	
	
	const comm = $(this).parent().children('.recComm').text()
	$('#inputComm').val(comm)
	
	
	console.log(hour)
	console.log(min)
	console.log(id)
	getId('pjInput').dataset.recId = id
	
	$('#inputDate').val(toISODate($(this).parent().children('.recDate').data('date')))

})

$('#saveTime').on('click', function() {
	
	if(!editMode){
		// todo check if timer is going -- maybe alert to which to use
		$('.animation').toggle()
		let name

		$('#pjSelect').val() != '--Select Project--' ? name = $('#pjSelect').val() : name = $('#pjInput').val()
		const d = new Date($('#inputDate').val()).getTime()
		//console.log(d)
		const h = $('#inputHour').val(),
			m = $('#inputMin').val(),
			c = $('#inputComm').val();
		//console.log(name, ' ', d, ' ', h, ' ', m)
		
		mkProject(name, d, h, m, c)
	}
	else {
		setUpdate()
	}
})

function setUpdate() {

	const id = getId('pjInput').dataset.recId
		,name = $('#pjInput').val() == '' ? getId('pjSelect').value : getId('pjInput').value
		,d = new Date(getId('inputDate').value).getTime()
		,h = getId('inputHour').value
		,m = getId('inputMin').value
		,c = getId('inputComm').value
	;

	console.log(id, ' ', name, ' ', d, ' ', h, ' ', m, c)

	updateProject(id, name, d, h, m, c)

}
function updateProject(recId, name, date, hour, min, comments) {

	if (recId && name && date && hour && min) {
		var postData = {
			name: name,
			date: date,
			hour: hour,
			min: min,
			comm: comments
		};

		// Write the new post's data simultaneously in the posts list and the user's post list.
		let updates = {};
		updates['/users/' + userId + '/projects/' + recId] = postData;
		
		
		editMode = false
		clearInputs()
		
		return firebase.database().ref().update(updates);


	}
	else {
		mkToast('Did not save! Missing values')
	}
}

$('#deleteProject').on('click', function() {

	const id = $('#modalName').data('recId')
	console.log('>> deleting Record: ', id)

	deleteProject(id)
	$('.modal').closeModal()
})

$('#updateUser').on('click', function() {
	updateUser($('.displayName').val())
})

/*FUNCTIONS*/
function handleProjects(projects) {
	$('#projThisWeek').empty()
	$.each(projects, function(index, key) {
		//console.log('>>Project: ', index)
		//console.dir(this)
		const d = new Date(this.date)
		d.getTime() >= lastWeek.getTime() ? projThisWeek(index, this) : projLastWeek(index, this)
		pjName.includes(this.name) ? '' : pjName.push(this.name)
	})

	pjName.sort()

	$.each(pjName, function() {
		$('#pjSelect').append('<option>' + this + '</option>')
	})

}

function projThisWeek(key, rec) {
	
	let d = new Date(rec.date)
	
	let todo = ''
	d > today ? todo = '<span class="badge todoBadge">TODO</span>' : ''
	d = d.toLocaleString('en-us', {
		month: "long"
	}) + ' ' + d.getDate()
    
	rec.comm = rec.comm ? rec.comm : '(No Comments)'
    
	$('#projThisWeek').append(
        
		'<div id="'+key+'">' +
			'<span id="' + key + '" class="title recName">' + rec.name + '</span>&nbsp;&middot;&nbsp;' +
			'<span class="recDate" data-date="' + rec.date + '">' + d + '</span>&nbsp;&middot;&nbsp;' +
			'H: <span class="recHour">' + rec.hour + '</span>&nbsp;&middot;&nbsp;' +
			'M: <span class="recMin">' + rec.min + '</span>' +
			'<br/>'+
			todo +
			'<span class="recComm">' + rec.comm + '</span>&nbsp;' +
			'<i class="material-icons editMode">mode_edit</i>' +
		'</div>'
	)
	//console.log('projThisWeek func ran')
}

function projLastWeek(key, rec) {

	let d = new Date(rec.date)
	//console.log(d, ' VS ', last2Week)
	if (d >= last2Week) {
		d = d.toLocaleString('en-us', {
			month: "long"
		}) + ' ' + d.getDate()

		rec.comm = rec.comm ? rec.comm : '(No Comments)'

		$('#projLastWeek').append(
			
    		'<div id="'+key+'">' +
    			'<span id="' + key + '" class="title recName">' + rec.name + '</span>&nbsp;&middot;&nbsp;' +
    			'<span class="recDate" data-date="' + rec.date + '">' + d + '</span>&nbsp;&middot;&nbsp;' +
    			'H: <span class="recHour">' + rec.hour + '</span>&nbsp;&middot;&nbsp;' +
    			'M: <span class="recMin">' + rec.min + '</span>' +
    			'<br/>'+
    			'<span class="recComm">' + rec.comm + '</span>&nbsp;' +
    			'<i class="material-icons editMode">mode_edit</i>' +
    		'</div>'
		)
	}
	else {
		oldProjs.push(rec)
	}
	//console.log('projLastWeek func ran')
}


function mkProject(name, date, hour, min, comments) {
	if (name && date && hour && min) {
		var postData = {
			name: name,
			date: date,
			hour: hour,
			min: min,
			comm: comments
		};

		const newPostKey = firebase.database().ref('users/' + userId).child('projects').push().key;

		// Write the new post's data simultaneously in the posts list and the user's post list.
		let updates = {};
		updates['/users/' + userId + '/projects/' + newPostKey] = postData;

		return firebase.database().ref().update(updates);
	}
	else {
		mkToast('Did not save! Missing values')
	}
}


function clearInputs(){
	
	editMode = false
	
	getId('pjSelect').value = getId('pjSelect').options[0].text
	
	getId('inputHour').value = null

	getId('inputMin').value = null

	getId('pjInput').value = ''
	getId('inputComm').value = ''
	
	getId('inputDate').value = new Date().getTime()
	
}

function deleteProject(recId) {
	recId ? firebase.database().ref('/users/' + userId + '/projects/' + recId).remove() : mkToast('Did not remove: Missing values...')
}


function mkToast(msg, time, type) {
	$('#toast').text(msg).fadeIn(400).delay(time).fadeOut(400);
}


function updateUser(name) {

	const user = firebase.auth().currentUser;

	user.updateProfile({
		displayName: name,
	}).then(function() {
		console.log('success ')
	}, function(error) {
		console.dir(error)
	});
}







getId('toggleAllData').onclick = () => {
	$('#allData').is(":visible") ? $('#allData').hide() : $('#allData').show()
}













$(".start").click(function() {
	if (timerRan) {
		timerRan = true
		if ($(this).hasClass('started')) {
			//console.log('pause')
			$(".time").timer('pause')
			timerTime = $(".time").data('seconds')
			//console.log('timerTime == ', timerTime)
			$(this).text('Resume').removeClass('started')
		}
		else {

			$(".time").timer({
				format: '%h:%M:%S'
			})


			timerTime = $(".time").data('seconds') // todo when saving get this again in case they don't pause and just save; also reset then
			//console.log('timerTime == ', timerTime)
			$(".time").timer('resume')
			$(this).text('Pause').addClass('started')
		}
	}
});


$("select").on('change', function() {
	//console.log('selected ' + this.value);
	selProjName = this.value
});


$(function() {
	$('.weekToggle').click(function() {
		if ($('#lastWeek').is(":visible")) {
			$('.projToToggle').hide();
			$('#thisWeek').show();
		}
		else {
			$('.projToToggle').hide();
			$('#lastWeek').show();
		}
	})

	$('a.toggleProject').click(function() {
		if ($('#newProject').is(":visible")) {
			$('.projToToggle').hide();
			$('#thisWeek').show();
		}
		else {
			$('.projToToggle').hide();
			$('#newProject').show();
		}
	})
})



function validateEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}

function toISODate(milliseconds) {
	var date = new Date(milliseconds);
	var y = date.getFullYear()
	var m = date.getMonth() + 1;
	var d = date.getDate();
	m = (m < 10) ? '0' + m : m;
	d = (d < 10) ? '0' + d : d;
	return [y, m, d].join('-');
}
