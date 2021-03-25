var template = (function(){
	let _getTopSMTableTemplate = function(){
		let template = $('[data-field="template-best-sm-table"]').clone().removeClass('d-none').removeAttr('data-field');
		template.find('tbody').empty();
		return template;
	}
	
	let _getTopSMRowTemplate = function(){
		return $('[data-field="template-best-sm-row"]').clone().removeClass('d-none').removeAttr('data-field');
	}
	
	let _getTopKMSTemplate = function() {
		return $('[data-field="top-k-ms-template"]').clone().removeClass('d-none').removeAttr('data-field');
	}
	
	let _getOptionChainContainerTemplate = function(){
		return $('[data-field="option-chain-container-template"]').clone().removeClass('d-none').removeAttr('data-field');
	}
	
	let _getTickerTemplate = function(){
		return $('[data-field="ticker-template"]').clone().removeClass('d-none').removeAttr('data-field');
	}
	
	return {
		getTopSMTableTemplate: _getTopSMTableTemplate,
		getTopSMRowTemplate: _getTopSMRowTemplate,
		getTopKMSTemplate: _getTopKMSTemplate,
		getOptionChainContainerTemplate: _getOptionChainContainerTemplate,
		getTickerTemplate: _getTickerTemplate
	}
})();