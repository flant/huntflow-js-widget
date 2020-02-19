var api_prefix = 'https://job-api.flant.ru';
function prepareApplicantData(data, $form) {    
    var applicantData;
    console.log(data);
    try {
        if (data.fields != null) {
            applicantData = {};
            if (data.fields.hasOwnProperty('name') && data.fields.name != null) {
                applicantData['last_name'] = (data.fields.name.hasOwnProperty('last') && data.fields.name.last != null && data.fields.name.last.length > 0) ? data.fields.name.last : 'Неизвестно';            
                applicantData['first_name'] = (data.fields.name.hasOwnProperty('first') && data.fields.name.first != null && data.fields.name.first.length > 0) ? data.fields.name.first : 'Неизвестно';
                data.fields.name.hasOwnProperty('middle') && (applicantData['middle_name'] = data.fields.name.middle);
            } else {
                applicantData['last_name'] = 'Неизвестно';
                applicantData['first_name'] = 'Неизвестно';
            }        
            data.fields.hasOwnProperty('phones') && data.fields.phones != null && data.fields.phones.length > 0 && (applicantData['phone'] = data.fields.phones[0]);        
            data.fields.hasOwnProperty('email') && data.fields.email != null && data.fields.email.length > 0 && (applicantData['email'] = data.fields.email);        
            if (data.fields.hasOwnProperty('experience') && data.fields.experience != null && data.fields.experience.length > 0) {            
                data.fields.experience[0].hasOwnProperty('position') && data.fields.experience[0].position != null && data.fields.experience[0].position.length > 0 && (applicantData['position'] = data.fields.experience[0].position);
                data.fields.experience[0].hasOwnProperty('company') && data.fields.experience[0].company != null && data.fields.experience[0].company.length > 0 && (applicantData['company'] = data.fields.experience[0].company);                        
            }        
            data.fields.hasOwnProperty('salary') && data.fields.salary != null && data.fields.salary.length > 0 && (applicantData['money'] = data.fields.salary);
            if (data.fields.hasOwnProperty('birthdate') && data.fields.birthdate != null) {
                data.fields.birthdate.hasOwnProperty('day') && data.fields.birthdate.day != null && data.fields.birthdate.day.length > 0 && (applicantData['birthday_day'] = data.fields.birthdate.day);
                data.fields.birthdate.hasOwnProperty('month') && data.fields.birthdate.month != null && data.fields.birthdate.month.length > 0 && (applicantData['birthday_month'] = data.fields.birthdate.month);
                data.fields.birthdate.hasOwnProperty('year') && data.fields.birthdate.year != null && data.fields.birthdate.year.length > 0 && (applicantData['birthday_year'] = data.fields.birthdate.year);
            }
            data.hasOwnProperty('photo') && data.photo != null && data.photo.hasOwnProperty('id') && data.photo.id != null && data.photo.id.length > 0 && (applicantData['photo'] = data.photo.id);        
            var applicantDataBody = 'Резюме отправлено с job.flant.ru\n' + 'Контактные данные: ' +$form.find('[name="contact"]').val() + '\n\n\n';
            data.hasOwnProperty('text') && (applicantDataBody = applicantDataBody + data.text);
            applicantData['externals'] = [
                {
                    "data": {
                        "body": applicantDataBody,
                    },
                    "auth_type": "NATIVE",
                    "files": [
                        {
                            "id": data.id
                        }
                    ]
                }
            ];
        } else {
            applicantData = null;
        }
        return applicantData;
    }
    catch (e) {
        handleFormError($form, 'application data parsing went wrong', e);
    }    
}

function handleFormError($form, m, e) {
    $form.addClass('sent');
    $form.addClass('error');
    m && console.log(m);
    e && console.log(e);
    if (typeof Sentry !== 'undefined') {
        Sentry.configureScope(function(scope) {
            scope.setExtra('Contact', $form.find('[name="contact"]').val());
            e && scope.setExtra('Context', JSON.stringify(e));            
        });
        Sentry.captureMessage('HR Form: ' + m);
    }        
}

var formNotificationTimeout;
function sendForm($form) {    
    var fileFormData = new FormData();
    fileFormData.append('file', $form.find('[name="file"]')[0].files[0]);        
    var $formNotification = $form.find('.hr-form__notification');

    var vacancy_id = $form.data('vacancy-id');
    var status_id = $form.data('status-id');

    if($form.find('[name="file"]')[0].files[0] && $form.find('[name="contact"]').val() != '') {
        $form.addClass('sent');
        $.ajax({
            url: api_prefix + '/api/upload',
            data: fileFormData,
            cache: false,
            contentType: false,
            processData: false,
            method: 'POST',
            type: 'POST',
            success: function(parsedFileDataResponse){
                console.log('file uploaded');
                var applicantData = prepareApplicantData(parsedFileDataResponse, $form);
                console.log(applicantData);
                if (applicantData != null) {
                    $.ajax({
                        url: api_prefix + '/api/vacancy_request',
                        data: JSON.stringify(applicantData),
                        contentType: "application/json; charset=utf-8",
                        cache: false,
                        processData: false,
                        method: 'POST',
                        type: 'POST',
                        success: function(applicationResponse){
                            console.log('application success');
                            console.log(applicationResponse);
                            $form.addClass('success');
                            if (vacancy_id != '') {
                                var vacancyData = {
                                    "vacancy": vacancy_id,
                                    "status": status_id,
                                    "comment": "Кандидат добавлен на вакансию через заявку с job.flant.ru",
                                    "files": [
                                        {
                                            "id": applicantData.externals[0].files[0].id
                                        }
                                    ],
                                    "rejection_reason": null
                                }
                                $.ajax({
                                    url: api_prefix + '/api/vacancy_request/' + applicationResponse.id,
                                    data: JSON.stringify(vacancyData),
                                    contentType: "application/json; charset=utf-8",
                                    cache: false,
                                    processData: false,
                                    method: 'POST',
                                    type: 'POST',
                                    success: function(vacancyResponse){
                                        console.log('vacancy success');
                                        console.log(vacancyResponse);
                                    },
                                    error: function(vacancyResponse) {
                                        handleFormError($form, 'vacancy failed', vacancyResponse)
                                    }
                                });
                            }
                        },
                        error: function(applicationResponse) {
                            handleFormError($form, 'application failed', applicationResponse)
                        }
                    });
                } else {
                    handleFormError($form, 'file parse failed: empty data');
                }                  
            },
            error: function(parsedFileDataResponse) {
                handleFormError($form, 'file upload failed', parsedFileDataResponse);
            }
        });                                  
    } else {
        clearTimeout(formNotificationTimeout);
        $formNotification.slideDown();
        formNotificationTimeout = setTimeout(function(){ 
            $formNotification.slideUp();
        }, 10000);                        
    }    
}

$(document).on('click tap', '.hr-form-submit', function(e) {
    e.preventDefault();
    sendForm($(this).closest('.hr-form'));    
});

$(document).on('click tap', '.hr-form__upload .hr-form__button', function(e) {
    e.preventDefault();
    $(this).next().click();
});    

$(document).on('change', '.hr-form-file', function(e) {        
    $(this).prev('button').text($(this)[0].files[0].name); 
});