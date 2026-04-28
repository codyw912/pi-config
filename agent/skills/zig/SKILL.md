---
name: zig
description: Write, review, refactor, migrate, or debug idiomatic Zig 0.16.0 code. Use for Zig source, build.zig/build.zig.zon, std.Io migrations, allocator ownership, error handling, tests, C interop, and code-review checklists.
---

# Idiomatic Zig 0.16.0 Cookbook

Use this skill whenever a task involves Zig 0.16.0 code or a repository that appears to target Zig 0.16.x. Zig is still pre-1.0, so treat version-specific APIs as part of the task, not trivia. Favor code that is explicit, resource-safe, allocation-aware, testable, and easy to cross-compile.

## Operating mode for Codex

1. Establish the target Zig version.
   - If shell access exists, run `zig version` or inspect `build.zig.zon`, lockfiles, CI, README, and release scripts.
   - If the project is not on Zig 0.16.x, do not blindly apply this skill's API recipes. Use this skill only for style principles and explain version differences when relevant.
   - If no Zig executable is available, still make the best patch, but state that examples or changes were not compiled.
2. Inspect the project before editing.
   - Read `build.zig`, `build.zig.zon`, `src/`, tests, CI, and any repository instructions.
   - Identify whether the project is an executable, library, freestanding target, WASI target, C interop wrapper, or build-tool-heavy package.
   - Check whether the project uses `std.Io`, `std.process.Init`, `.empty` containers, and Zig 0.16 build APIs.
3. Prefer the smallest correct change.
   - Do not rewrite architecture unless the user asks.
   - Preserve public API unless the task is a migration or API redesign.
   - Keep ownership rules and error behavior explicit.
4. Validate.
   - Always run `zig fmt` on changed `.zig` files when possible.
   - Prefer `zig build test`, then `zig build`, then targeted `zig test path/to/file.zig` depending on the project.
   - For dependency or cross-target changes, run the same commands CI runs if feasible.
   - For build-script changes, run `zig build --summary all` or the relevant step.
   - For slow or flaky tests, consider `zig build test --test-timeout <duration>`.
5. Report honestly.
   - Mention exactly what was changed, which commands passed, which commands failed, and whether any snippets were uncompiled.
   - If using a compatibility workaround, say why.

## Definition of done

A Zig 0.16 solution is done when:

- Code is `zig fmt` formatted.
- Allocated memory has one clear owner and one clear cleanup path.
- I/O-capable functions accept or use an appropriate `std.Io` value instead of reaching for global state.
- Error handling uses `try`, `catch`, `errdefer`, and explicit error sets deliberately.
- Tests cover the changed behavior, or the response explains why tests were not added.
- Build-system changes expose standard `-Dtarget` and `-Doptimize` options when appropriate.
- New public declarations have useful doc comments when they form part of the API.

## High-level Zig style

Write Zig as Zig, not as C, Rust, Go, or C++.

- Prefer plain data and plain functions over elaborate abstractions.
- Prefer `const` by default. Use `var` only when the binding itself changes or a mutable pointer to it is needed.
- Keep function signatures honest: parameters should reveal allocation, I/O, ownership, and failure.
- Prefer slices (`[]T`, `[]const T`) over raw pointers when a length exists.
- Prefer optionals (`?T`) over sentinel or magic values.
- Prefer error unions (`Error!T`) over bool-success outputs or global error state.
- Prefer `defer` and `errdefer` immediately after resource acquisition.
- Prefer comptime generics only when they improve type safety or performance. Do not make every helper generic.
- Avoid hidden allocation. If a function allocates, it should usually accept a `std.mem.Allocator` and document who frees.
- Avoid hidden I/O. If a function may block, touch the file system, get time, read entropy, run network operations, or spawn processes, it should usually accept `io: std.Io` or be called from a context that has one.
- Avoid global mutable state. Pass state through parameters or explicit structs.
- Avoid clever control flow. Zig rewards obvious resource lifetimes.

## Naming and layout conventions

Use the style found in the Zig standard library:

- Types: `PascalCase` (`Parser`, `TokenKind`, `Config`).
- Functions and methods: `camelCase` (`parseFile`, `writeAll`, `initCapacity`).
- Variables and fields: `snake_case` (`read_buffer`, `max_bytes`, `file_path`).
- Constants that are values: usually `snake_case` unless they are types or namespaces.
- Namespaces are structs or files; keep them short and purposeful.
- In methods, name the receiver `self`.
- Inside generic structs, define `const Self = @This();` near the top.
- File names are usually `snake_case.zig` for modules and `main.zig` for executables.

Prefer this order inside source files:

```zig
const std = @import("std");
const Io = std.Io;

const Self = @This(); // only inside a struct-like container

pub const PublicType = struct { ... };
const PrivateType = struct { ... };

pub fn publicFunction(...) ... { ... }
fn privateFunction(...) ... { ... }

test "behavior being tested" { ... }
```

## Main functions in Zig 0.16

Use `std.process.Init` when you need `io`, allocator conveniences, CLI arguments, environment variables, preopens, or other process initialization data.

Minimal stdout:

```zig
const std = @import("std");
const Io = std.Io;

pub fn main(init: std.process.Init) !void {
    try Io.File.stdout().writeStreamingAll(init.io, "hello world\n");
}
```

Formatted stdout:

```zig
const std = @import("std");
const Io = std.Io;

pub fn main(init: std.process.Init) !void {
    const io = init.io;

    var buffer: [4096]u8 = undefined;
    var file_writer = Io.File.stdout().writer(io, &buffer);
    const stdout = &file_writer.interface;

    try stdout.print("answer={d}\n", .{42});
    try stdout.flush();
}
```

Use `std.debug.print` for quick diagnostics and logging-like messages to stderr. Do not use it when the program's stdout is meaningful output.

```zig
pub fn main() void {
    std.debug.print("debug: {s}\n", .{"starting"});
}
```

CLI arguments:

```zig
pub fn main(init: std.process.Init) !void {
    const arena = init.arena.allocator();
    const args = try init.minimal.args.toSlice(arena);

    if (args.len != 2) {
        std.log.err("usage: {s} <path>", .{args[0]});
        return error.InvalidArguments;
    }

    try run(init.io, init.gpa, args[1]);
}
```

When writing libraries, do not require `std.process.Init`; accept only the capabilities needed:

```zig
pub fn loadConfig(io: std.Io, allocator: std.mem.Allocator, path: []const u8) !Config {
    const bytes = try std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(1 << 20));
    errdefer allocator.free(bytes);
    return parseConfig(allocator, bytes);
}
```

If upgrading old code and no `Io` is available, create one at the boundary, not deep inside reusable logic:

```zig
var threaded: std.Io.Threaded = .init_single_threaded;
const io = threaded.io();
```

## `std.Io` rules for Zig 0.16

Zig 0.16 moves I/O into an explicit interface. Treat `std.Io` as a capability object for operations that may block, suspend, cancel, or depend on nondeterminism.

Common rules:

- Pass `io: std.Io` into functions that perform file, network, process, time, entropy, or cancelable operations.
- Prefer accepting `io` as a parameter over creating `Io.Threaded` internally.
- Use `init.io` in `main(init: std.process.Init)`.
- Use `std.testing.io` in tests that need I/O.
- Update old `std.fs.File` and `std.fs.Dir` usage to `std.Io.File` and `std.Io.Dir` where applicable.
- Most old file methods now take `io` explicitly.
- Use `std.Io.Reader` and `std.Io.Writer`; do not use old `std.io.GenericReader`, `std.io.AnyReader`, or `std.io.fixedBufferStream` patterns.

Old-to-new examples:

```zig
// Zig 0.16 pattern:
var buf: [1024]u8 = undefined;
var writer = std.Io.File.stdout().writer(io, &buf);
try writer.interface.print("{d}\n", .{n});
try writer.interface.flush();
```

```zig
// Zig 0.16:
var reader: std.Io.Reader = .fixed(data);
```

```zig
const contents = try std.Io.Dir.cwd().readFileAlloc(io, file_name, allocator, .limited(max_bytes));
defer allocator.free(contents);
```

File write:

```zig
pub fn writeTextFile(io: std.Io, path: []const u8, text: []const u8) !void {
    var file = try std.Io.Dir.cwd().createFile(io, path, .{});
    defer file.close(io);

    try file.writeStreamingAll(io, text);
}
```

File read with maximum size:

```zig
pub fn readSmallFile(
    io: std.Io,
    allocator: std.mem.Allocator,
    path: []const u8,
) ![]u8 {
    return std.Io.Dir.cwd().readFileAlloc(io, path, allocator, .limited(64 * 1024));
}
```

Current path:

```zig
const cwd_path = try std.process.currentPathAlloc(io, allocator);
defer allocator.free(cwd_path);
```

## Allocators and ownership

Allocator use is a core part of Zig API design. Any function that allocates should usually accept a `std.mem.Allocator` parameter and document ownership.

Good signatures:

```zig
pub fn parseOwned(allocator: std.mem.Allocator, source: []const u8) !Document
pub fn readConfig(io: std.Io, allocator: std.mem.Allocator, path: []const u8) ![]u8
pub fn render(allocator: std.mem.Allocator, doc: Document) ![]u8
```

Document ownership in comments:

```zig
/// Returns an owned UTF-8 buffer. Caller must free it with `allocator.free`.
pub fn renderTitle(allocator: std.mem.Allocator, title: []const u8) ![]u8 {
    return std.fmt.allocPrint(allocator, "# {s}\n", .{title});
}
```

Use `defer` immediately after acquisition and `errdefer` after acquisition when ownership transfers on success.

## Containers in Zig 0.16

Zig 0.16 moves standard containers toward the unmanaged style: containers often no longer store an allocator, and methods that allocate take an allocator argument.

```zig
const std = @import("std");

pub fn collectBytes(allocator: std.mem.Allocator) ![]u8 {
    var list: std.ArrayList(u8) = .empty;
    defer list.deinit(allocator);

    try list.appendSlice(allocator, "hello");
    try list.append(allocator, ' ');
    try list.appendSlice(allocator, "world");

    return list.toOwnedSlice(allocator);
}
```

Rules:

- Initialize empty containers with `.empty` when provided.
- Pass the allocator to allocating methods such as `append`, `appendSlice`, `ensureTotalCapacity`, `deinit`, and `toOwnedSlice` when the API requires it.
- Do not keep pointers into container storage across calls that may reallocate.
- Prefer `toOwnedSlice` when returning accumulated data to the caller.

## Strings, bytes, slices, and sentinels

Zig has no separate string type. Treat text as UTF-8 by convention, usually `[]const u8`.

- `[]const u8`: borrowed read-only byte slice, often a string.
- `[]u8`: mutable byte slice.
- `[:0]const u8`: sentinel-terminated string slice for C-like APIs.
- `[*:0]const u8`: sentinel-terminated pointer, often from or to C.

Prefer slices over pointers and do not return slices into stack arrays.

## Errors and cleanup

Use errors for expected failure modes, not panics. Use panics for programmer bugs and impossible states.

Good error-union API:

```zig
const ParseError = error{
    Empty,
    InvalidDigit,
    Overflow,
};

fn parsePort(text: []const u8) ParseError!u16 {
    if (text.len == 0) return error.Empty;
    return std.fmt.parseInt(u16, text, 10) catch |err| switch (err) {
        error.InvalidCharacter => error.InvalidDigit,
        error.Overflow => error.Overflow,
    };
}
```

Use `try` for normal propagation and `catch` when recovering or translating errors.

Avoid overusing `anyerror` in public APIs. Use `unreachable` only for invariants proven by program structure.

## Optionals

Use optionals for absence.

```zig
fn findUser(users: []const User, id: u64) ?User {
    for (users) |user| {
        if (user.id == id) return user;
    }
    return null;
}
```

## Control flow idioms

- Use `for` for slices and arrays.
- Use `while` when state changes in the loop expression.
- Use labeled blocks for expression-style initialization when helpful.
- Use `switch` for exhaustive enum and error handling.
- Do not force expression style when a simple `if` or `switch` statement is clearer.

## `comptime`, generics, and reflection

Use comptime and generics when they improve type safety or performance, not by default.

```zig
pub fn Stack(comptime T: type) type {
    return struct {
        const Self = @This();

        items: []T,
        len: usize = 0,

        pub fn init(storage: []T) Self {
            return .{ .items = storage };
        }

        pub fn push(self: *Self, value: T) !void {
            if (self.len == self.items.len) return error.NoSpaceLeft;
            self.items[self.len] = value;
            self.len += 1;
        }

        pub fn pop(self: *Self) ?T {
            if (self.len == 0) return null;
            self.len -= 1;
            return self.items[self.len];
        }
    };
}
```

Use `anytype` sparingly; prefer concrete interfaces like `*std.Io.Writer` when that is the real requirement.

## Numeric code

Be explicit with integer widths and casts.

- Use `usize` for indexing and lengths.
- Use fixed-width integers for file formats, protocols, hashes, and FFI.
- Use `std.math.cast` when runtime failure should be handled.
- Use `@truncate` only when truncation is intended and documented.
- Avoid silent wraparound unless deliberate.

## Build system cookbook

Prefer a `build.zig` that exposes target and optimization choices and defines clear steps.

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "app",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    b.installArtifact(exe);
}
```

Guidance:

- Keep `build.zig.zon` committed.
- Do not commit `.zig-cache` or `zig-out`.
- Expose standard `-Dtarget` and `-Doptimize` options.
- Prefer deterministic build scripts.

Useful commands:

```bash
zig fmt build.zig src/**/*.zig
zig build --summary all
zig build test --summary all
zig build test --test-timeout 500ms
zig build -Dtarget=x86_64-linux -Doptimize=ReleaseSafe
zig build --fork=/path/to/dependency
zig build -fincremental --watch
```

## Testing cookbook

Prefer tests close to the code under test and use named tests with behavior-oriented names.

```zig
const std = @import("std");

fn addOne(x: i32) i32 {
    return x + 1;
}

test "addOne increments positive values" {
    try std.testing.expectEqual(@as(i32, 42), addOne(41));
}
```

Use:
- `std.testing.allocator` for allocation tests
- `std.testing.io` for I/O tests
- `expectError` for error behavior

Avoid writing to stdout from unit tests.

## C interop in Zig 0.16

For tiny FFI calls, direct `extern` declarations are often clearer than translated headers.

```zig
const win = @import("std").os.windows;

extern "user32" fn MessageBoxA(
    ?win.HWND,
    [*:0]const u8,
    [*:0]const u8,
    u32,
) callconv(.winapi) i32;
```

For larger header translation in Zig 0.16, prefer moving C translation to the build system rather than using `@cImport` directly in source.

FFI rules:

- Use `extern fn` for imported C functions.
- Use `export fn` for Zig functions exposed to C or other languages.
- Use explicit calling conventions when needed.
- Use sentinel-terminated strings for C strings.
- Keep unsafe pointer manipulation at the boundary.

## Logging and output

Use the right channel:

- Program output: stdout via `std.Io.File.stdout()` and `std.Io.Writer`.
- Diagnostics/logging: `std.log` or `std.debug.print` to stderr.
- Tests: prefer assertions; keep logs minimal.

For libraries, avoid logging unless the library's API explicitly includes logging behavior. Return errors and let applications decide how to report them.

## Migration checklist: Zig 0.15-ish to 0.16

When migrating code to 0.16, scan for these patterns.

### Main/process

- Old code may use `pub fn main() !void` and then query global args/env. In 0.16, use `pub fn main(init: std.process.Init) !void` when args/env/io are needed.
- Environment variables and process arguments are no longer treated as convenient global state.

### I/O and filesystem

- `std.io` -> `std.Io` in many places.
- `std.fs.File` -> `std.Io.File`.
- `std.fs.Dir` -> `std.Io.Dir`.
- Many methods now require `io`.
- `std.fs.cwd()` -> `std.Io.Dir.cwd()` for 0.16 I/O APIs.

### Readers/writers

- `std.io.fixedBufferStream(data)` -> `var reader: std.Io.Reader = .fixed(data)`.
- `std.Io.GenericReader` and `std.Io.AnyReader` -> `std.Io.Reader`.

### Containers

- `ArrayList(T).init(allocator)` -> `var list: std.ArrayList(T) = .empty`.
- Container methods often take allocators explicitly.

Use this checklist before doing broad automated migrations.
