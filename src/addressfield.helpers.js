/**
 * Given a country code, this will return the country's name.
 * @param {String} country_code
 * @return {String}
 */
function addressfield_get_country_name(country_code) {
  try {
    return _addressfield_countries[country_code];
  }
  catch (error) { console.log('addressfield_get_country_name - ' + error); }
}

/**
 * Given an address_format object and a field name, this will return true if the
 * field is required, false if it isn't.
 */
function _addressfield_widget_field_required(address_format, field_name) {
  try {
    return in_array(field_name, address_format.required_fields);
  }
  catch (error) { console.log('_addressfield_widget_field_required - ' + error); }
}

/**
 *
 */
function _addressfield_field_widget_form_country_onchange(select, widget_id, delta, field_name) {
  try {
    //console.log('_addressfield_field_widget_form_country_onchange', arguments);
    var variables = _addressfield_elements[widget_id];
    var country_code = $(select).val();
    addressfield_get_address_format_and_administrative_areas(country_code, {
      success: function(results) {

        var address_format = results.address_format;
        var administrative_areas = results.administrative_areas;
        //console.log(address_format);
        //console.log(administrative_areas);

        // Iterate over each "used_fields" on the address format and add them
        // to the widget. Some may or may not be required, and may have custom
        // labels applied along the way. We will render each separately
        var html = '';
        var components = [];

        // Try to grab the field instance.
        var entityType = $(select).attr('entity_type');
        var bundle = $(select).attr('bundle');
        var instance = entityType && bundle && field_name.indexOf('field_') != -1 ?
            drupalgap_field_info_instance(entityType, field_name, bundle) : null;

        //console.log(address_format, administrative_areas, instance, _addressfield_elements);

        // @TODO - need to add support for name components!

        // Determine which components will be hidden, if any.
        var showNameLine = false;
        var showFirstName = false;
        var showLastName = false;
        var showThoroughfare = false;
        var showPremise = false;
        var address_optional = false;
        if (instance && instance.widget.settings.format_handlers['address-hide-street'] == 0) {
          showThoroughfare = true;
          showPremise = true;
        }
        else if (variables.components) {
          showNameLine = typeof variables.components.name_line !== 'undefined';
          showFirstName = typeof variables.components.first_name !== 'undefined';
          showLastName = typeof variables.components.last_name !== 'undefined';
          showThoroughfare = typeof variables.components.thoroughfare !== 'undefined';
          showPremise = typeof variables.components.premise !== 'undefined';
        }

        if (instance &&
        typeof instance.widget.settings.format_handlers['address-optional'] !== 'undefined' &&
        instance.widget.settings.format_handlers['address-optional'] == 'address-optional') {
          address_optional = true;
        }

        // Name line
        if (showNameLine && !showFirstName && !showLastName) {
          components.push({
            theme: 'textfield',
            attributes: {
              placeholder: t('Full name'),
              id: widget_id + '-name_line',
              class: 'addressfield-name-line'
            },
            required: !address_optional
          });
        }

        // First name
        if (showFirstName && !showNameLine) {
          components.push({
            theme: 'textfield',
            attributes: {
              placeholder: t('First name'),
              id: widget_id + '-first_name',
              class: 'addressfield-first-name'
            },
            required: !address_optional
          });
        }

        // Last name
        if (showLastName && !showNameLine) {
          components.push({
            theme: 'textfield',
            attributes: {
              placeholder: t('Last name'),
              id: widget_id + '-last_name',
              class: 'addressfield-last-name'
            },
            required: !address_optional
          });
        }

        // thoroughfare
        if (showThoroughfare) {
          components.push({
            theme: 'textfield',
            attributes: {
              placeholder: t('Address 1'),
              id: widget_id + '-thoroughfare',
              class: 'addressfield-thoroughfare'
            },
            required: !address_optional
          });
        }

        // premise
        if (showPremise) {
          components.push({
            theme: 'textfield',
            attributes: {
              placeholder: t('Address 2'),
              id: widget_id + '-premise',
              class: 'addressfield-premise'
            }
          });
        }

        // locality
        var locality_required = _addressfield_widget_field_required(address_format, 'locality');
        if (address_optional) {
          locality_required = false;
        }
        components.push({
          theme: 'textfield',
          attributes: {
            placeholder: address_format.locality_label,
            id: widget_id + '-locality',
            class: 'addressfield-locality'
          },
          required: locality_required
        });

        // administrative_area
        if (administrative_areas) {
          var adm_areas_required = _addressfield_widget_field_required(address_format, 'administrative_area');
          if (address_optional) {
            adm_areas_required = false;
          }
          var adm_areas_options = {};
          //If administrative_area is not required add the -nothing- option
          if (!adm_areas_required) {
            adm_areas_options[''] = t('-Ninguno-');
          }
          for (var value in administrative_areas) {
            adm_areas_options[value] = administrative_areas[value];
          }
          components.push({
            theme: 'select',
            options: adm_areas_options,
            attributes: {
              id: widget_id + '-administrative_area',
              class: 'addressfield-administrative-area'
            },
            required: adm_areas_required
          });
        }

        // postal_code
        var postal_code_required = _addressfield_widget_field_required(address_format, 'postal_code');
        if (address_optional) {
          postal_code_required = false;
        }
        components.push({
          theme: 'textfield',
          attributes: {
            placeholder: address_format.postal_code_label,
            id: widget_id + '-postal_code',
            class: 'addressfield-postal-code'
          },
          required: postal_code_required
        });

        // Now render each widget then inject them into the container.
        $.each(components, function(index, widget) {
          if (widget.required) {
            widget.attributes.placeholder += '*';
          }
          html += theme(widget.theme, widget);
        });
        $('#' + $(select).attr('id') + '-widget').html(html).trigger('create');

      }
    });
  }
  catch (error) { console.log('_addressfield_field_widget_form_country_onchange - ' + error); }
}

function addressfield_services_postprocess_inject() {
  // @TODO replace with call to addressfield_inject_components()...?
  var components = addressfield_get_components();
  $.each(_address_field_items, function(field_name, items) {
    $.each(items, function(delta, object) {
      var id = object.id;
      var item = object.item;
      $.each(components, function(index, component) {
        if (component == 'country') { return; } // skip country
        var selector = '#' + id + '-' + component;
        $(selector).val(item[component]);
        if (component == 'administrative_area') {
          $(selector).selectmenu('refresh', true).change();
        }
      });
    });
    delete(_address_field_items[field_name]);
  });
}
