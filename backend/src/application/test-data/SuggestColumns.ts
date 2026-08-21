// SuggestColumns - AI-assisted column recommendations based on API schemas
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';

export interface ColumnSuggestion {
  name: string;
  displayName: string;
  dataType: string;
  required: boolean;
  unique: boolean;
  nullable: boolean;
  description: string;
  usedBy: string[];
}

export class SuggestColumns {
  constructor(
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly apiServiceRepository: ApiServiceRepository
  ) {}

  async execute(params: {
    projectId: string;
    datasetName: string;
  }): Promise<{ suggestions: ColumnSuggestion[] }> {
    const services = await this.apiServiceRepository.findByProject(params.projectId);
    const suggestions: ColumnSuggestion[] = [];
    const fieldMap = new Map<string, ColumnSuggestion>();

    for (const service of services) {
      const operations = await this.apiOperationRepository.findByService(service.id);
      
      for (const op of operations) {
        const opRef = `${op.method} ${op.path}`;
        
        // Extract field names from operation name and path
        const fields = this.extractFieldsFromOperation(op, params.datasetName);
        
        for (const field of fields) {
          if (fieldMap.has(field.name)) {
            // Add this operation to usedBy
            if (!fieldMap.get(field.name)!.usedBy.includes(opRef)) {
              fieldMap.get(field.name)!.usedBy.push(opRef);
            }
          } else {
            fieldMap.set(field.name, {
              ...field,
              usedBy: [opRef],
            });
          }
        }
      }
    }

    // Convert map to array
    for (const suggestion of fieldMap.values()) {
      suggestions.push(suggestion);
    }

    return { suggestions };
  }

  private extractFieldsFromOperation(operation: any, datasetName: string): ColumnSuggestion[] {
    const fields: ColumnSuggestion[] = [];
    const nameLower = datasetName.toLowerCase();

    // Common field patterns based on dataset name
    const commonFields = this.getCommonFieldsForDataset(nameLower);
    
    // Check if operation name/path relates to the dataset
    const opNameLower = (operation.name || '').toLowerCase();
    const opPathLower = (operation.path || '').toLowerCase();
    
    if (opNameLower.includes(nameLower) || opPathLower.includes(nameLower) || 
        opNameLower.includes('login') || opNameLower.includes('register') ||
        opNameLower.includes('create') || opNameLower.includes('signup')) {
      for (const field of commonFields) {
        fields.push(field);
      }
    }

    return fields;
  }

  private getCommonFieldsForDataset(datasetName: string): ColumnSuggestion[] {
    const fieldMap: Record<string, ColumnSuggestion[]> = {
      'users': [
        { name: 'email', displayName: 'Email', dataType: 'Email', required: true, unique: true, nullable: false, description: 'User email address', usedBy: [] },
        { name: 'password', displayName: 'Password', dataType: 'Text', required: true, unique: false, nullable: false, description: 'User password', usedBy: [] },
        { name: 'firstName', displayName: 'First Name', dataType: 'Text', required: true, unique: false, nullable: false, description: 'User first name', usedBy: [] },
        { name: 'lastName', displayName: 'Last Name', dataType: 'Text', required: true, unique: false, nullable: false, description: 'User last name', usedBy: [] },
        { name: 'phoneNumber', displayName: 'Phone Number', dataType: 'Phone', required: false, unique: false, nullable: true, description: 'User phone number', usedBy: [] },
        { name: 'createdAt', displayName: 'Created At', dataType: 'DateTime', required: true, unique: false, nullable: false, description: 'Account creation timestamp', usedBy: [] },
      ],
      'customers': [
        { name: 'email', displayName: 'Email', dataType: 'Email', required: true, unique: true, nullable: false, description: 'Customer email', usedBy: [] },
        { name: 'firstName', displayName: 'First Name', dataType: 'Text', required: true, unique: false, nullable: false, description: 'Customer first name', usedBy: [] },
        { name: 'lastName', displayName: 'Last Name', dataType: 'Text', required: true, unique: false, nullable: false, description: 'Customer last name', usedBy: [] },
        { name: 'phone', displayName: 'Phone', dataType: 'Phone', required: false, unique: false, nullable: true, description: 'Customer phone', usedBy: [] },
        { name: 'address', displayName: 'Address', dataType: 'Text', required: false, unique: false, nullable: true, description: 'Customer address', usedBy: [] },
      ],
      'products': [
        { name: 'name', displayName: 'Product Name', dataType: 'Text', required: true, unique: true, nullable: false, description: 'Product name', usedBy: [] },
        { name: 'price', displayName: 'Price', dataType: 'Decimal', required: true, unique: false, nullable: false, description: 'Product price', usedBy: [] },
        { name: 'sku', displayName: 'SKU', dataType: 'Text', required: true, unique: true, nullable: false, description: 'Stock keeping unit', usedBy: [] },
        { name: 'description', displayName: 'Description', dataType: 'Text', required: false, unique: false, nullable: true, description: 'Product description', usedBy: [] },
        { name: 'quantity', displayName: 'Quantity', dataType: 'Number', required: true, unique: false, nullable: false, description: 'Available quantity', usedBy: [] },
      ],
      'orders': [
        { name: 'orderId', displayName: 'Order ID', dataType: 'UUID', required: true, unique: true, nullable: false, description: 'Unique order identifier', usedBy: [] },
        { name: 'customerId', displayName: 'Customer ID', dataType: 'UUID', required: true, unique: false, nullable: false, description: 'Reference to customer', usedBy: [] },
        { name: 'totalAmount', displayName: 'Total Amount', dataType: 'Decimal', required: true, unique: false, nullable: false, description: 'Order total', usedBy: [] },
        { name: 'status', displayName: 'Status', dataType: 'Text', required: true, unique: false, nullable: false, description: 'Order status', usedBy: [] },
        { name: 'orderDate', displayName: 'Order Date', dataType: 'DateTime', required: true, unique: false, nullable: false, description: 'Order creation date', usedBy: [] },
      ],
      'payments': [
        { name: 'paymentId', displayName: 'Payment ID', dataType: 'UUID', required: true, unique: true, nullable: false, description: 'Unique payment identifier', usedBy: [] },
        { name: 'orderId', displayName: 'Order ID', dataType: 'UUID', required: true, unique: false, nullable: false, description: 'Reference to order', usedBy: [] },
        { name: 'amount', displayName: 'Amount', dataType: 'Decimal', required: true, unique: false, nullable: false, description: 'Payment amount', usedBy: [] },
        { name: 'method', displayName: 'Payment Method', dataType: 'Text', required: true, unique: false, nullable: false, description: 'Payment method', usedBy: [] },
        { name: 'status', displayName: 'Status', dataType: 'Text', required: true, unique: false, nullable: false, description: 'Payment status', usedBy: [] },
      ],
    };

    return fieldMap[datasetName] || [
      { name: 'id', displayName: 'ID', dataType: 'UUID', required: true, unique: true, nullable: false, description: 'Unique identifier', usedBy: [] },
      { name: 'name', displayName: 'Name', dataType: 'Text', required: true, unique: false, nullable: false, description: 'Name field', usedBy: [] },
      { name: 'description', displayName: 'Description', dataType: 'Text', required: false, unique: false, nullable: true, description: 'Description field', usedBy: [] },
      { name: 'createdAt', displayName: 'Created At', dataType: 'DateTime', required: true, unique: false, nullable: false, description: 'Creation timestamp', usedBy: [] },
      { name: 'updatedAt', displayName: 'Updated At', dataType: 'DateTime', required: true, unique: false, nullable: false, description: 'Last update timestamp', usedBy: [] },
    ];
  }
}

export default SuggestColumns;