# MyST Runner Demo

This file demonstrates the features of the `jupyterlab-myst-runner` extension.
Open it in JupyterLab and click the ▶ play button in the gutter to run any code block.

---

## Basic Python

A simple block to verify the kernel connection is working.

```python
print("Hello from MyST Runner!")
```

---

## Variables and arithmetic

Variables persist across runs within the same console session.

```python
x = 6
y = 7
print(f"{x} × {y} = {x * y}")
```

```python
# This block can access x and y from the block above
result = x * y
print(f"result is {result}")
```

---

## Data with NumPy

```python
import numpy as np

arr = np.linspace(0, 2 * np.pi, 8)
print("angles (rad):", arr.round(3))
print("sin values: ", np.sin(arr).round(3))
```

---

## Plotting with Matplotlib

```python
import matplotlib.pyplot as plt
import numpy as np

t = np.linspace(0, 2 * np.pi, 300)
fig, ax = plt.subplots()
ax.plot(t, np.sin(t), label="sin(t)")
ax.plot(t, np.cos(t), label="cos(t)")
ax.legend()
ax.set_title("Trig functions")
plt.show()
```

---

## MyST Directives

The extension highlights MyST-specific syntax like admonition directives.
These are not executable — they render as formatted blocks in MyST renderers.

:::{note}
This is a MyST `note` directive. The `:::` fence syntax is unique to MyST
and is highlighted differently from regular fenced code blocks.
:::

:::{warning}
Watch out! This is a `warning` directive.
:::

:::::{important}
Directives can be nested by using a longer fence.

:::{tip}
Inner tip inside an important block.
:::
:::::

---

## MyST Inline Roles

Inline roles like {math}`E = mc^2` and {code}`print("hello")` are also
recognized and highlighted by the extension.

---

## Shell Commands

```bash
echo "Running in bash"
date
uname -a
```

---

## JavaScript

```javascript
const greet = name => `Hello, ${name}!`;
console.log(greet("MyST Runner"));
```

---

## Mixing prose and code

MyST is designed for computational narratives. You can interleave
explanatory prose with runnable code blocks.

First, create some data:

```python
data = {"apples": 5, "bananas": 3, "cherries": 12}
```

Then compute a summary:

```python
total = sum(data.values())
for fruit, count in data.items():
    pct = count / total * 100
    print(f"{fruit:10s} {count:3d}  ({pct:.1f}%)")
print(f"{'total':10s} {total:3d}  (100.0%)")
```
