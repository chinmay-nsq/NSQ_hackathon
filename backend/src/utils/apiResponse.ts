class ApiResponse<T = unknown> {
  constructor(
    public status: number,
    public message: string,
    public data: T,
    public success: boolean = true
  ) {}
}

export { ApiResponse };
